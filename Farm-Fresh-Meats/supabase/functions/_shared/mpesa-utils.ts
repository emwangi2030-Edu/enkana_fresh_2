// Shared M-Pesa utilities for Supabase Edge Functions

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_URL = "https://api.safaricom.co.ke";

function getBaseUrl(): string {
  return Deno.env.get("MPESA_ENVIRONMENT") === "production" ? PRODUCTION_URL : SANDBOX_URL;
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
  const shortCode = Deno.env.get("MPESA_SHORTCODE") || "174379";
  const passKey = Deno.env.get("MPESA_PASSKEY") || "";
  return btoa(`${shortCode}${passKey}${timestamp}`);
}

export function formatPhone(phone: string): string {
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

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-Pesa consumer key and secret are required");
  }

  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  const baseUrl = getBaseUrl();

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get M-Pesa access token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (parseInt(data.expires_in) - 60) * 1000,
  };

  return cachedToken.token;
}

interface StkPushRequest {
  phone: string;
  amount: number;
  orderId: string;
  accountReference?: string;
}

export async function initiateSTKPush(request: StkPushRequest) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);
  const shortCode = Deno.env.get("MPESA_SHORTCODE") || "174379";
  const baseUrl = getBaseUrl();

  const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL")
    || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

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
    TransactionDesc: "Enkana Fresh Order Payment",
  };

  console.log(`[M-Pesa] Initiating STK Push to ${formatPhone(request.phone)} for KES ${request.amount}`);

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
    throw new Error(`M-Pesa STK Push failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function querySTKPushStatus(checkoutRequestId: string) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);
  const shortCode = Deno.env.get("MPESA_SHORTCODE") || "174379";
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

interface StkCallbackItem {
  Name: string;
  Value?: string | number;
}

interface StkCallbackBody {
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

export function parseCallback(body: StkCallbackBody) {
  const cb = body.Body.stkCallback;
  const result: Record<string, any> = {
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
