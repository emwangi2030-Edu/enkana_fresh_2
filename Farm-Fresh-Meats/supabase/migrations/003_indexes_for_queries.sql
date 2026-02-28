-- Optional: indexes to speed up common queries (Phase 3 performance).
-- Run in Supabase SQL Editor if list/customer/order queries are slow.
CREATE INDEX IF NOT EXISTS idx_orders_delivery_month ON orders (delivery_month);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout_request_id ON orders (mpesa_checkout_request_id);
