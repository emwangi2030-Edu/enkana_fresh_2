// Supabase Edge Function: M-Pesa STK Push
// Deploy with: supabase functions deploy mpesa-stkpush
// Required secrets (set via Supabase Dashboard > Edge Functions > Secrets):
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
//   MPESA_ENVIRONMENT (sandbox or production)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
//   MPESA_CALLBACK_URL (e.g. https://<project>.supabase.co/functions/v1/mpesa-callback)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getAccessToken, initiateSTKPush, formatPhone } from "../_shared/mpesa-utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ message: "Order ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ message: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ message: "Order is already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.total_amount || order.total_amount <= 0) {
      return new Response(JSON.stringify({ message: "Order has no amount to pay" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stkResponse = await initiateSTKPush({
      phone: order.phone,
      amount: order.total_amount,
      orderId: order.id,
    });

    await supabase
      .from("orders")
      .update({
        mpesa_checkout_request_id: stkResponse.CheckoutRequestID,
        payment_status: "pending",
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        message: "STK Push sent successfully",
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        responseDescription: stkResponse.ResponseDescription,
        customerMessage: stkResponse.CustomerMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[M-Pesa] STK Push error:", error.message);
    return new Response(
      JSON.stringify({ message: `Failed to send payment request: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
