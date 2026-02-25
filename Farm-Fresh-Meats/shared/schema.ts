import { z } from "zod";

export interface User {
  id: string;
  username: string;
  password: string;
}

export interface InsertUser {
  username: string;
  password: string;
}

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string | null;
  locationPin: string | null;
  createdAt: string;
}

export const insertCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  location: z.string().nullable().optional(),
  locationPin: z.string().nullable().optional(),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export const PRODUCTS = [
  { id: "beef", name: "Beef Meat", unit: "kg", pricePerUnit: 750 },
  { id: "goat", name: "Goat Meat", unit: "kg", pricePerUnit: 800 },
  { id: "mutton", name: "Mutton", unit: "kg", pricePerUnit: 850 },
  { id: "chicken", name: "Kienyeji Chicken", unit: "whole", pricePerUnit: 1200 },
] as const;

export type Product = (typeof PRODUCTS)[number];

export const orderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().min(0.5),
  unit: z.string(),
  pricePerUnit: z.number(),
  subtotal: z.number(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export interface Order {
  id: string;
  customerId: string | null;
  customerName: string;
  phone: string;
  items: OrderItem[];
  totalAmount: number | null;
  status: string;
  paymentStatus: string;
  mpesaTransactionId: string | null;
  mpesaCheckoutRequestId: string | null;
  paidAt: string | null;
  notes: string | null;
  deliveryMonth: string | null;
  createdAt: string;
}

export const insertOrderSchema = z.object({
  customerId: z.string().nullable().optional(),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  items: z.array(orderItemSchema),
  totalAmount: z.number().nullable().optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  mpesaTransactionId: z.string().nullable().optional(),
  mpesaCheckoutRequestId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  deliveryMonth: z.string().nullable().optional(),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;

export interface Payment {
  id: string;
  orderId: string | null;
  mpesaTransactionId: string;
  amount: number;
  phoneNumber: string;
  transactionDate: string;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  resultCode: number | null;
  resultDesc: string | null;
  createdAt: string;
}

export const insertPaymentSchema = z.object({
  orderId: z.string().nullable().optional(),
  mpesaTransactionId: z.string(),
  amount: z.number(),
  phoneNumber: z.string(),
  transactionDate: z.any(),
  merchantRequestId: z.string().nullable().optional(),
  checkoutRequestId: z.string().nullable().optional(),
  resultCode: z.number().nullable().optional(),
  resultDesc: z.string().nullable().optional(),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export interface PaymentException {
  id: string;
  mpesaTransactionId: string | null;
  checkoutRequestId: string | null;
  amount: number | null;
  phoneNumber: string | null;
  resultCode: number | null;
  resultDesc: string | null;
  reason: string | null;
  resolved: boolean | null;
  createdAt: string;
}

export const insertPaymentExceptionSchema = z.object({
  mpesaTransactionId: z.string().nullable().optional(),
  checkoutRequestId: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  resultCode: z.number().nullable().optional(),
  resultDesc: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  resolved: z.boolean().optional(),
});

export type InsertPaymentException = z.infer<typeof insertPaymentExceptionSchema>;
