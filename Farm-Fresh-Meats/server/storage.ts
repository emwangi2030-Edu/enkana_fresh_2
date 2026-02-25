import {
  type User, type InsertUser,
  type Order, type InsertOrder,
  type Customer, type InsertCustomer,
  type Payment, type InsertPayment,
  type PaymentException, type InsertPaymentException,
} from "@shared/schema";
import { supabase } from "../lib/supabase";

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

function rowToCustomer(row: any): Customer {
  return toCamelCase(row) as Customer;
}

function rowToOrder(row: any): Order {
  return toCamelCase(row) as Order;
}

function rowToPayment(row: any): Payment {
  return toCamelCase(row) as Payment;
}

function rowToPaymentException(row: any): PaymentException {
  return toCamelCase(row) as PaymentException;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  getOrders(): Promise<Order[]>;
  getOrdersByCustomerId(customerId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByCheckoutRequestId(checkoutRequestId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderPaymentStatus(id: string, status: string): Promise<void>;
  markOrderPaid(orderId: string, mpesaTransactionId: string, paymentData: InsertPayment): Promise<void>;
  deleteOrder(id: string): Promise<boolean>;
  getPayments(): Promise<Payment[]>;
  getPaymentsByOrderId(orderId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentExceptions(): Promise<PaymentException[]>;
  createPaymentException(exception: InsertPaymentException): Promise<PaymentException>;
  resolvePaymentException(id: string): Promise<PaymentException | undefined>;
}

export class SupabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("id", id).single();
    return data || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data } = await supabase.from("users").select("*").eq("username", username).single();
    return data || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase.from("users").insert(insertUser).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToCustomer);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const { data } = await supabase.from("customers").select("*").eq("id", id).single();
    return data ? rowToCustomer(data) : undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const snakeData = toSnakeCase(customer as Record<string, any>);
    const { data, error } = await supabase.from("customers").insert(snakeData).select().single();
    if (error) throw new Error(error.message);
    return rowToCustomer(data);
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const snakeData = toSnakeCase(updates as Record<string, any>);
    const { data, error } = await supabase.from("customers").update(snakeData).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data ? rowToCustomer(data) : undefined;
  }

  async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToOrder);
  }

  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    const { data, error } = await supabase.from("orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToOrder);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const { data } = await supabase.from("orders").select("*").eq("id", id).single();
    return data ? rowToOrder(data) : undefined;
  }

  async getOrderByCheckoutRequestId(checkoutRequestId: string): Promise<Order | undefined> {
    const { data } = await supabase.from("orders").select("*").eq("mpesa_checkout_request_id", checkoutRequestId).single();
    return data ? rowToOrder(data) : undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const snakeData = toSnakeCase(order as Record<string, any>);
    const { data, error } = await supabase.from("orders").insert(snakeData).select().single();
    if (error) throw new Error(error.message);
    return rowToOrder(data);
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const snakeData = toSnakeCase(updates as Record<string, any>);
    const { data, error } = await supabase.from("orders").update(snakeData).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data ? rowToOrder(data) : undefined;
  }

  async updateOrderPaymentStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase.from("orders").update({ payment_status: status }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async markOrderPaid(orderId: string, mpesaTransactionId: string, paymentData: InsertPayment): Promise<void> {
    const { error: orderError } = await supabase.from("orders").update({
      payment_status: "paid",
      mpesa_transaction_id: mpesaTransactionId,
      paid_at: new Date().toISOString(),
    }).eq("id", orderId);
    if (orderError) throw new Error(orderError.message);

    const snakePayment = toSnakeCase(paymentData as Record<string, any>);
    if (snakePayment.transaction_date instanceof Date) {
      snakePayment.transaction_date = snakePayment.transaction_date.toISOString();
    }
    const { error: paymentError } = await supabase.from("payments").insert(snakePayment);
    if (paymentError) throw new Error(paymentError.message);
  }

  async deleteOrder(id: string): Promise<boolean> {
    const { data, error } = await supabase.from("orders").delete().eq("id", id).select("id");
    if (error) throw new Error(error.message);
    return (data || []).length > 0;
  }

  async getPayments(): Promise<Payment[]> {
    const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToPayment);
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToPayment);
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const snakeData = toSnakeCase(payment as Record<string, any>);
    if (snakeData.transaction_date instanceof Date) {
      snakeData.transaction_date = snakeData.transaction_date.toISOString();
    }
    const { data, error } = await supabase.from("payments").insert(snakeData).select().single();
    if (error) throw new Error(error.message);
    return rowToPayment(data);
  }

  async getPaymentExceptions(): Promise<PaymentException[]> {
    const { data, error } = await supabase.from("payment_exceptions").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToPaymentException);
  }

  async createPaymentException(exception: InsertPaymentException): Promise<PaymentException> {
    const snakeData = toSnakeCase(exception as Record<string, any>);
    const { data, error } = await supabase.from("payment_exceptions").insert(snakeData).select().single();
    if (error) throw new Error(error.message);
    return rowToPaymentException(data);
  }

  async resolvePaymentException(id: string): Promise<PaymentException | undefined> {
    const { data, error } = await supabase.from("payment_exceptions").update({ resolved: true }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data ? rowToPaymentException(data) : undefined;
  }
}

export const storage = new SupabaseStorage();
