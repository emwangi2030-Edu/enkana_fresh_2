-- Enkana Fresh: RLS Policies for Direct Frontend Access
-- Run this in Supabase SQL Editor to enable authenticated admin users
-- to perform CRUD operations directly from the frontend using the anon key.
--
-- SECURITY NOTE: This app uses a single-admin model. Only one Supabase Auth
-- user exists (admin@enkanafresh.com). Policies restrict access to the
-- 'authenticated' role, which is sufficient since no public sign-up is enabled.
-- If you ever add more Supabase Auth users, restrict these policies further
-- by checking auth.jwt() ->> 'email' = 'admin@enkanafresh.com' or using
-- a custom admin_users table.
--
-- Prerequisites: Supabase Auth user already created (admin@enkanafresh.com)
--                Public sign-up DISABLED in Supabase Auth settings

-- ============================================================
-- 1. Drop existing permissive policies (service-role bypass only)
-- ============================================================
DROP POLICY IF EXISTS "Allow service role full access" ON customers;
DROP POLICY IF EXISTS "Allow service role full access" ON orders;
DROP POLICY IF EXISTS "Allow service role full access" ON payments;
DROP POLICY IF EXISTS "Allow service role full access" ON payment_exceptions;
DROP POLICY IF EXISTS "Allow service role full access" ON users;

DROP POLICY IF EXISTS "service_role_customers" ON customers;
DROP POLICY IF EXISTS "service_role_orders" ON orders;
DROP POLICY IF EXISTS "service_role_payments" ON payments;
DROP POLICY IF EXISTS "service_role_payment_exceptions" ON payment_exceptions;
DROP POLICY IF EXISTS "service_role_users" ON users;

-- Drop any other existing policies to start clean
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('customers', 'orders', 'payments', 'payment_exceptions', 'users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 2. Ensure RLS is enabled on all tables
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Authenticated user policies (admin access via Supabase Auth)
--    Any user authenticated via Supabase Auth can manage all data.
--    In production, you may want to add role checks.
-- ============================================================

-- CUSTOMERS: Full CRUD for authenticated users
CREATE POLICY "auth_select_customers" ON customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_customers" ON customers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_customers" ON customers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_customers" ON customers
  FOR DELETE TO authenticated USING (true);

-- ORDERS: Full CRUD for authenticated users
CREATE POLICY "auth_select_orders" ON orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_orders" ON orders
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_orders" ON orders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_orders" ON orders
  FOR DELETE TO authenticated USING (true);

-- PAYMENTS: Select and Insert for authenticated users
CREATE POLICY "auth_select_payments" ON payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_payments" ON payments
  FOR INSERT TO authenticated WITH CHECK (true);

-- PAYMENT EXCEPTIONS: Full access for authenticated users
CREATE POLICY "auth_select_payment_exceptions" ON payment_exceptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_payment_exceptions" ON payment_exceptions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_payment_exceptions" ON payment_exceptions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- USERS: Select only for authenticated users
CREATE POLICY "auth_select_users" ON users
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 4. Service role bypass (for Edge Functions using service_role key)
-- ============================================================
CREATE POLICY "service_role_customers" ON customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_orders" ON orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_payments" ON payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_payment_exceptions" ON payment_exceptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 5. M-Pesa callback: Allow anonymous inserts to payments
--    and payment_exceptions (callback comes from Safaricom)
--    Edge Functions use service_role key, so this is optional.
-- ============================================================
-- If using Edge Functions with service_role, these are not needed.
-- Uncomment if you need anonymous callback access:
-- CREATE POLICY "anon_insert_payments" ON payments
--   FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "anon_insert_payment_exceptions" ON payment_exceptions
--   FOR INSERT TO anon WITH CHECK (true);
-- CREATE POLICY "anon_update_orders_payment" ON orders
--   FOR UPDATE TO anon USING (true) WITH CHECK (true);
