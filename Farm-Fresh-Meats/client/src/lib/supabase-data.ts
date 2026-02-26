import { supabase } from "./supabase";
import type { Order, InsertOrder, Customer, InsertCustomer, Payment, PaymentException, ProductCatalogueItem, InsertProductCatalogueItem } from "@shared/schema";

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => toCamelCase(r) as Customer);
}

export type CustomersPage = { customers: Customer[]; total: number };

export async function fetchCustomersPaginated(opts: {
  page: number;
  limit: number;
  search?: string;
}): Promise<CustomersPage> {
  const { page, limit, search } = opts;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search && search.trim()) {
    const term = search.trim().replace(/[%_\\]/g, "\\$&");
    query = query.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,location.ilike.%${term}%,delivery_zone.ilike.%${term}%,notes.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const customers = (data || []).map((r) => toCamelCase(r) as Customer);
  return { customers, total: count ?? 0 };
}

export async function createCustomer(customer: InsertCustomer): Promise<Customer> {
  const snakeData = toSnakeCase(customer as Record<string, any>);
  const { data, error } = await supabase
    .from("customers")
    .insert(snakeData)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamelCase(data) as Customer;
}

export async function updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer> {
  const snakeData = toSnakeCase(updates as Record<string, any>);
  const { data, error } = await supabase
    .from("customers")
    .update(snakeData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamelCase(data) as Customer;
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  return (data || []).length > 0;
}

// Products (editable catalogue)
export async function fetchProducts(): Promise<ProductCatalogueItem[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => toCamelCase(r) as ProductCatalogueItem);
}

export async function createProduct(product: InsertProductCatalogueItem): Promise<ProductCatalogueItem> {
  const snakeData = toSnakeCase(product as Record<string, any>);
  const { data, error } = await supabase
    .from("products")
    .insert(snakeData)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamelCase(data) as ProductCatalogueItem;
}

export async function updateProduct(id: string, updates: Partial<InsertProductCatalogueItem>): Promise<ProductCatalogueItem> {
  const snakeData = toSnakeCase(updates as Record<string, any>);
  const { data, error } = await supabase
    .from("products")
    .update(snakeData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamelCase(data) as ProductCatalogueItem;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  return (data || []).length > 0;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => toCamelCase(r) as Order);
}

export async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return toCamelCase(data) as Order;
}

export async function fetchOrdersByCustomerId(customerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => toCamelCase(r) as Order);
}

export async function createOrder(order: InsertOrder): Promise<Order> {
  const snakeData = toSnakeCase(order as Record<string, any>);
  const { data, error } = await supabase
    .from("orders")
    .insert(snakeData)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamelCase(data) as Order;
}

export async function updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order> {
  const snakeData = toSnakeCase(updates as Record<string, any>);
  const { data, error } = await supabase
    .from("orders")
    .update(snakeData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamelCase(data) as Order;
}

export async function deleteOrder(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  return (data || []).length > 0;
}

export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => toCamelCase(r) as Payment);
}

export async function fetchPaymentExceptions(): Promise<PaymentException[]> {
  const { data, error } = await supabase
    .from("payment_exceptions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => toCamelCase(r) as PaymentException);
}

export async function resolvePaymentException(id: string): Promise<PaymentException> {
  const { data, error } = await supabase
    .from("payment_exceptions")
    .update({ resolved: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return toCamelCase(data) as PaymentException;
}

const EDGE_FUNCTION_BASE = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

export async function requestMpesaPayment(orderId: string): Promise<{
  message: string;
  checkoutRequestId: string;
  customerMessage: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${EDGE_FUNCTION_BASE}/mpesa-stkpush`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ orderId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to send payment request" }));
    throw new Error(err.message || "Failed to send payment request");
  }

  return res.json();
}

export async function queryMpesaStatus(checkoutRequestId: string): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(`${EDGE_FUNCTION_BASE}/mpesa-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ checkoutRequestId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Failed to query status" }));
    throw new Error(err.message || "Failed to query status");
  }

  return res.json();
}
