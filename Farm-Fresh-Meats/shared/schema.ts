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
  deliveryZone?: string | null;
  lockedPriceMode?: "promo" | "standard" | null;
  notes?: string | null;
  tags?: string[] | null;
  createdAt: string;
}

export const insertCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  location: z.string().nullable().optional(),
  locationPin: z.string().nullable().optional(),
  deliveryZone: z.string().nullable().optional(),
  lockedPriceMode: z.enum(["promo", "standard"]).nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// §2 Product catalogue: promo/standard prices, chicken sizes, sourcing
export type SourcingType = "slaughter" | "resale" | "chicken";
export type AnimalType = "goat" | "sheep" | "beef" | "chicken_small" | "chicken_medium" | "chicken_large" | null;

export interface ProductCatalogueItem {
  id: string;
  name: string;
  unit: string;
  promoPrice: number;
  standardPrice: number;
  costPrice: number | null;
  sourcingType: SourcingType;
  animalType: AnimalType;
  available?: boolean;
  createdAt?: string;
}

export type InsertProductCatalogueItem = Omit<ProductCatalogueItem, "createdAt"> & { createdAt?: string };

export const PRODUCT_CATALOGUE: ProductCatalogueItem[] = [
  { id: "goat", name: "Goat Meat", unit: "kg", promoPrice: 750, standardPrice: 800, costPrice: null, sourcingType: "slaughter", animalType: "goat" },
  { id: "mutton", name: "Mutton", unit: "kg", promoPrice: 750, standardPrice: 800, costPrice: null, sourcingType: "slaughter", animalType: "sheep" },
  { id: "beef", name: "Beef", unit: "kg", promoPrice: 800, standardPrice: 800, costPrice: 650, sourcingType: "resale", animalType: "beef" },
  { id: "chicken_small", name: "Chicken — Small", unit: "whole bird", promoPrice: 1000, standardPrice: 1000, costPrice: 500, sourcingType: "chicken", animalType: "chicken_small" },
  { id: "chicken_medium", name: "Chicken — Medium", unit: "whole bird", promoPrice: 1500, standardPrice: 1500, costPrice: 800, sourcingType: "chicken", animalType: "chicken_medium" },
  { id: "chicken_large", name: "Chicken — Large", unit: "whole bird", promoPrice: 2000, standardPrice: 2000, costPrice: 1300, sourcingType: "chicken", animalType: "chicken_large" },
];

// Global pricing mode: switches active sell price across the app (§2)
export type PricingMode = "promo" | "standard";
export let PRICING_MODE: PricingMode = "promo";

export function setPricingMode(mode: PricingMode): void {
  PRICING_MODE = mode;
}

export function getProductPrice(item: ProductCatalogueItem, mode: PricingMode): number {
  return mode === "promo" ? item.promoPrice : item.standardPrice;
}

// Flattened product list: all catalogue items with both prices; use getProductPrice(item, mode) for active price
export const PRODUCTS: ReadonlyArray<{
  id: string;
  name: string;
  unit: string;
  promoPrice: number;
  standardPrice: number;
}> = PRODUCT_CATALOGUE.map((p) => ({
  id: p.id,
  name: p.name,
  unit: p.unit,
  promoPrice: p.promoPrice,
  standardPrice: p.standardPrice,
}));

export type Product = (typeof PRODUCTS)[number];

/** Resolve price for display/order: use customer's locked mode or global PRICING_MODE */
export function getActivePrice(product: Product, customerLockedMode: PricingMode | null): number {
  const mode = customerLockedMode ?? PRICING_MODE;
  return mode === "promo" ? product.promoPrice : product.standardPrice;
}

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
  paidAt: z.string().nullable().optional(),
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
