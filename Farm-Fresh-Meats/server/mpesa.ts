const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_URL = "https://api.safaricom.co.ke";

function getBaseUrl(): string {
  return process.env.MPESA_ENVIRONMENT === "production" ? PRODUCTION_URL : SANDBOX_URL;
}

function getTimestamp(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generatePassword(timestamp: string): string {
  const shortCode = process.env.MPESA_SHORTCODE || "174379";
  const passKey = process.env.MPESA_PASSKEY || "";
  return Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  }
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }
  return cleaned;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-Pesa consumer key and secret are required");
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get M-Pesa access token: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: string };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (parseInt(data.expires_in) - 60) * 1000,
  };

  return cachedToken.token;
}

export interface StkPushRequest {
  phone: string;
  amount: number;
  orderId: string;
  accountReference?: string;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateSTKPush(request: StkPushRequest): Promise<StkPushResponse> {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);
  const shortCode = process.env.MPESA_SHORTCODE || "174379";
  const baseUrl = getBaseUrl();

  const callbackBaseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

  const callbackUrl = `${callbackBaseUrl}/api/mpesa/callback`;

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(request.amount),
    PartyA: formatPhone(request.phone),
    PartyB: shortCode,
    PhoneNumber: formatPhone(request.phone),
    CallBackURL: callbackUrl,
    AccountReference: request.accountReference || `ENKANA-${request.orderId.substring(0, 8).toUpperCase()}`,
    TransactionDesc: `Enkana Fresh Order Payment`,
  };

  console.log(`[M-Pesa] Initiating STK Push to ${formatPhone(request.phone)} for KES ${request.amount}`);
  console.log(`[M-Pesa] Callback URL: ${callbackUrl}`);

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[M-Pesa] STK Push failed: ${response.status} ${errorText}`);
    throw new Error(`M-Pesa STK Push failed: ${response.status} ${errorText}`);
  }

  const result = await response.json() as StkPushResponse;
  console.log(`[M-Pesa] STK Push response:`, JSON.stringify(result));
  return result;
}

export interface StkCallbackItem {
  Name: string;
  Value?: string | number;
}

export interface StkCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: StkCallbackItem[];
      };
    };
  };
}

export interface ParsedCallback {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

export function parseCallback(body: StkCallbackBody): ParsedCallback {
  const cb = body.Body.stkCallback;
  const result: ParsedCallback = {
    merchantRequestId: cb.MerchantRequestID,
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
  };

  if (cb.CallbackMetadata?.Item) {
    for (const item of cb.CallbackMetadata.Item) {
      switch (item.Name) {
        case "Amount":
          result.amount = Number(item.Value);
          break;
        case "MpesaReceiptNumber":
          result.mpesaReceiptNumber = String(item.Value);
          break;
        case "TransactionDate":
          result.transactionDate = String(item.Value);
          break;
        case "PhoneNumber":
          result.phoneNumber = String(item.Value);
          break;
      }
    }
  }

  return result;
}

export async function querySTKPushStatus(checkoutRequestId: string): Promise<any> {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);
  const shortCode = process.env.MPESA_SHORTCODE || "174379";
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`STK query failed: ${response.status} ${errorText}`);
  }

  return response.json();
}
