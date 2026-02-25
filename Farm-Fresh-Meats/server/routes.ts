import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertCustomerSchema } from "@shared/schema";
import { initiateSTKPush, parseCallback, querySTKPushStatus, type StkCallbackBody } from "./mpesa";
import { supabase } from "../lib/supabase";

function getAdminEmail(): string {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  return process.env.ADMIN_EMAIL ?? (username.includes("@") ? username : `${username}@enkanafresh.com`);
}

async function ensureAdminUserExists(): Promise<void> {
  const email = getAdminEmail();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
      return;
    }
    console.warn("[auth] Could not ensure admin user:", error.message);
  }
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = user;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await ensureAdminUserExists();

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: error.message });
    }

    res.json({
      ok: true,
      session: data.session,
      user: data.user,
    });
  });

  app.post("/api/auth/logout", async (req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({ isAdmin: false });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.json({ isAdmin: false });
    }

    res.json({ isAdmin: true, user });
  });

  app.get("/api/customers", requireAuth, async (_req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const customer = await storage.getCustomer(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid customer data", errors: parsed.error.flatten() });
    }
    const customer = await storage.createCustomer(parsed.data);
    res.status(201).json(customer);
  });

  app.patch("/api/customers/:id", requireAuth, async (req, res) => {
    const parsed = insertCustomerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid customer data", errors: parsed.error.flatten() });
    }
    const id = req.params.id as string;
    const customer = await storage.updateCustomer(id, parsed.data);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  });

  app.get("/api/customers/:id/orders", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const orders = await storage.getOrdersByCustomerId(id);
    res.json(orders);
  });

  app.get("/api/orders", requireAuth, async (_req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    const parsed = insertOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid order data", errors: parsed.error.flatten() });
    }
    const order = await storage.createOrder(parsed.data);
    res.status(201).json(order);
  });

  app.patch("/api/orders/:id", requireAuth, async (req, res) => {
    const parsed = insertOrderSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid order data", errors: parsed.error.flatten() });
    }
    const id = req.params.id as string;
    const order = await storage.updateOrder(id, parsed.data);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  });

  app.delete("/api/orders/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const deleted = await storage.deleteOrder(id);
    if (!deleted) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ message: "Order deleted" });
  });

  app.post("/api/mpesa/stkpush", requireAuth, async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.paymentStatus === "paid") {
        return res.status(400).json({ message: "Order is already paid" });
      }

      if (!order.totalAmount || order.totalAmount <= 0) {
        return res.status(400).json({ message: "Order has no amount to pay" });
      }

      const stkResponse = await initiateSTKPush({
        phone: order.phone,
        amount: order.totalAmount,
        orderId: order.id,
      });

      await storage.updateOrder(order.id, {
        mpesaCheckoutRequestId: stkResponse.CheckoutRequestID,
        paymentStatus: "pending",
      });

      res.json({
        message: "STK Push sent successfully. Customer will receive a prompt on their phone.",
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        responseDescription: stkResponse.ResponseDescription,
        customerMessage: stkResponse.CustomerMessage,
      });
    } catch (error: any) {
      console.error("[M-Pesa] STK Push error:", error.message);
      res.status(500).json({ message: `Failed to send payment request: ${error.message}` });
    }
  });

  app.post("/api/mpesa/callback", async (req, res) => {
    console.log("[M-Pesa] Callback received:", JSON.stringify(req.body, null, 2));

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });

    try {
      const callbackBody = req.body as StkCallbackBody;
      const parsed = parseCallback(callbackBody);

      const order = await storage.getOrderByCheckoutRequestId(parsed.checkoutRequestId);

      if (parsed.resultCode === 0 && parsed.mpesaReceiptNumber) {
        if (order) {
          await storage.markOrderPaid(order.id, parsed.mpesaReceiptNumber, {
            orderId: order.id,
            mpesaTransactionId: parsed.mpesaReceiptNumber,
            amount: parsed.amount || order.totalAmount || 0,
            phoneNumber: parsed.phoneNumber || order.phone,
            transactionDate: new Date(),
            merchantRequestId: parsed.merchantRequestId,
            checkoutRequestId: parsed.checkoutRequestId,
            resultCode: parsed.resultCode,
            resultDesc: parsed.resultDesc,
          });
          console.log(`[M-Pesa] Payment successful for order ${order.id}: ${parsed.mpesaReceiptNumber}`);
        } else {
          await storage.createPaymentException({
            mpesaTransactionId: parsed.mpesaReceiptNumber,
            checkoutRequestId: parsed.checkoutRequestId,
            amount: parsed.amount || 0,
            phoneNumber: parsed.phoneNumber || "",
            resultCode: parsed.resultCode,
            resultDesc: parsed.resultDesc,
            reason: "No matching order found for this checkout request",
          });
          console.log(`[M-Pesa] Payment received but no matching order: ${parsed.mpesaReceiptNumber}`);
        }
      } else {
        if (order) {
          await storage.updateOrderPaymentStatus(order.id, "unpaid");
        }

        await storage.createPaymentException({
          mpesaTransactionId: null,
          checkoutRequestId: parsed.checkoutRequestId,
          amount: parsed.amount || 0,
          phoneNumber: parsed.phoneNumber || "",
          resultCode: parsed.resultCode,
          resultDesc: parsed.resultDesc,
          reason: `Payment failed: ${parsed.resultDesc}`,
        });
        console.log(`[M-Pesa] Payment failed: ${parsed.resultDesc}`);
      }
    } catch (error: any) {
      console.error("[M-Pesa] Callback processing error:", error.message);
    }
  });

  app.get("/api/mpesa/status/:checkoutRequestId", requireAuth, async (req, res) => {
    try {
      const result = await querySTKPushStatus(req.params.checkoutRequestId as string);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payments", requireAuth, async (_req, res) => {
    const allPayments = await storage.getPayments();
    res.json(allPayments);
  });

  app.get("/api/payments/exceptions", requireAuth, async (_req, res) => {
    const exceptions = await storage.getPaymentExceptions();
    res.json(exceptions);
  });

  app.patch("/api/payments/exceptions/:id/resolve", requireAuth, async (req, res) => {
    const exception = await storage.resolvePaymentException(req.params.id as string);
    if (!exception) {
      return res.status(404).json({ message: "Exception not found" });
    }
    res.json(exception);
  });

  return httpServer;
}
