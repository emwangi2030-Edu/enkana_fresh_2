// Supabase Edge Function: M-Pesa Callback
// This is called by Safaricom after STK Push payment is completed.
// Deploy with: supabase functions deploy mpesa-callback --no-verify-jwt
// NOTE: --no-verify-jwt is required because Safaricom sends raw HTTP requests (no auth header)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, parseCallback } from "../_shared/mpesa-utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Immediately respond to Safaricom
  const body = await req.json();
  console.log("[M-Pesa] Callback received:", JSON.stringify(body));

  try {
    const parsed = parseCallback(body);

    // Find the order by checkout request ID
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("mpesa_checkout_request_id", parsed.checkoutRequestId)
      .single();

    if (parsed.resultCode === 0 && parsed.mpesaReceiptNumber) {
      if (order) {
        // Mark order as paid
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            mpesa_transaction_id: parsed.mpesaReceiptNumber,
            paid_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        // Create payment record
        await supabase.from("payments").insert({
          order_id: order.id,
          mpesa_transaction_id: parsed.mpesaReceiptNumber,
          amount: parsed.amount || order.total_amount || 0,
          phone_number: parsed.phoneNumber || order.phone,
          transaction_date: new Date().toISOString(),
          merchant_request_id: parsed.merchantRequestId,
          checkout_request_id: parsed.checkoutRequestId,
          result_code: parsed.resultCode,
          result_desc: parsed.resultDesc,
        });

        console.log(`[M-Pesa] Payment successful for order ${order.id}: ${parsed.mpesaReceiptNumber}`);
      } else {
        // Payment received but no matching order
        await supabase.from("payment_exceptions").insert({
          mpesa_transaction_id: parsed.mpesaReceiptNumber,
          checkout_request_id: parsed.checkoutRequestId,
          amount: parsed.amount || 0,
          phone_number: parsed.phoneNumber || "",
          result_code: parsed.resultCode,
          result_desc: parsed.resultDesc,
          reason: "No matching order found for this checkout request",
        });
        console.log(`[M-Pesa] Payment received but no matching order: ${parsed.mpesaReceiptNumber}`);
      }
    } else {
      // Payment failed
      if (order) {
        await supabase
          .from("orders")
          .update({ payment_status: "unpaid" })
          .eq("id", order.id);
      }

      await supabase.from("payment_exceptions").insert({
        mpesa_transaction_id: null,
        checkout_request_id: parsed.checkoutRequestId,
        amount: parsed.amount || 0,
        phone_number: parsed.phoneNumber || "",
        result_code: parsed.resultCode,
        result_desc: parsed.resultDesc,
        reason: `Payment failed: ${parsed.resultDesc}`,
      });
      console.log(`[M-Pesa] Payment failed: ${parsed.resultDesc}`);
    }
  } catch (error: any) {
    console.error("[M-Pesa] Callback processing error:", error.message);
  }

  return new Response(
    JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
