import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertCustomerSchema } from "@shared/schema";
import { initiateSTKPush, parseCallback, querySTKPushStatus, type StkCallbackBody } from "./mpesa";
import { supabase } from "../lib/supabase";

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? "admin@enkanafresh.com";
}

const SUPER_ADMIN_ROLE = "super_admin";
const ADMIN_ROLE = "admin";

/** Super admin and admin can invite users and edit roles. Bootstrap user gets super_admin. */
function canManageUsers(role: string | undefined): boolean {
  return role === SUPER_ADMIN_ROLE || role === ADMIN_ROLE;
}

// Only touches Supabase Auth (auth.users). Does not read or write orders, customers, payments, or any app data.
async function ensureAdminUserExists(): Promise<void> {
  const email = getAdminEmail();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: SUPER_ADMIN_ROLE },
  });

  if (!createError) {
    return;
  }

  if (
    createError.message?.includes("already been registered") ||
    createError.message?.includes("already exists")
  ) {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users?.find((u) => u.email === email);
    const currentRole = existing?.app_metadata?.role as string | undefined;
    // Ensure the bootstrap account (this email) always has super_admin
    if (existing && currentRole !== SUPER_ADMIN_ROLE) {
      await supabase.auth.admin.updateUserById(existing.id, {
        app_metadata: { ...(existing.app_metadata || {}), role: SUPER_ADMIN_ROLE },
      });
    }
    return;
  }
  console.warn("[auth] Could not ensure admin user:", createError.message);
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

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const role = user?.app_metadata?.role as string | undefined;
  if (!canManageUsers(role)) {
    return res.status(403).json({ message: "Forbidden: admin or super admin required" });
  }
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
      return res.json({ isAdmin: false, role: null });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.json({ isAdmin: false, role: null });
    }

    // Fetch latest user from DB so role and mfa_disabled are current (not stale JWT)
    const { data: fresh } = await supabase.auth.admin.getUserById(user.id);
    const appMeta = fresh?.user?.app_metadata ?? user.app_metadata ?? {};
    const role = (appMeta.role as string) ?? null;
    const mfaDisabled = (appMeta.mfa_disabled as boolean) ?? false;
    res.json({ isAdmin: true, user, role, mfaDisabled });
  });

  app.post("/api/me/mfa-disable", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { data: targetUser } = await supabase.auth.admin.getUserById(user.id);
    if (!targetUser?.user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(targetUser.user.app_metadata || {}), mfa_disabled: true },
    });
    if (error) return res.status(500).json({ message: error.message });
    res.json({ ok: true, mfaDisabled: true });
  });

  app.post("/api/me/mfa-enable", requireAuth, async (req, res) => {
    const user = (req as any).user;
    const { data: targetUser } = await supabase.auth.admin.getUserById(user.id);
    if (!targetUser?.user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(targetUser.user.app_metadata || {}), mfa_disabled: false },
    });
    if (error) return res.status(500).json({ message: error.message });
    res.json({ ok: true, mfaDisabled: false });
  });

  app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    const users = (data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      role: (u.app_metadata?.role as string) ?? "viewer",
      createdAt: u.created_at,
    }));
    res.json(users);
  });

  app.post("/api/users/invite", requireAuth, requireAdmin, async (req, res) => {
    const { email, role } = req.body as { email?: string; role?: string };
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    const safeRole = role === "admin" || role === "editor" ? role : "viewer";
    const tempPassword = req.body.temporaryPassword ?? crypto.randomUUID().slice(0, 12) + "Aa1!";
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: { role: safeRole },
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(201).json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: safeRole,
      },
      message: "User created. Share the temporary password with them securely.",
      temporaryPassword: tempPassword,
    });
  });

  app.patch("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const id = req.params.id as string;
    const { role } = req.body as { role?: string };
    if (!role || !["admin", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Valid role (admin, editor, viewer) is required" });
    }
    const { data: targetUser } = await supabase.auth.admin.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const { error } = await supabase.auth.admin.updateUserById(id, {
      app_metadata: { ...(targetUser.app_metadata || {}), role },
    });
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    res.json({ id, email: targetUser.email, role });
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
