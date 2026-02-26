-- Products & Pricing: editable catalogue with promo/standard prices and availability
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  promo_price numeric NOT NULL DEFAULT 0,
  standard_price numeric NOT NULL DEFAULT 0,
  cost_price numeric,
  sourcing_type text NOT NULL DEFAULT 'resale',
  animal_type text,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default catalogue (match shared/schema.ts PRODUCT_CATALOGUE)
INSERT INTO products (id, name, unit, promo_price, standard_price, cost_price, sourcing_type, animal_type, available)
VALUES
  ('goat', 'Goat Meat', 'kg', 750, 800, null, 'slaughter', 'goat', true),
  ('mutton', 'Mutton', 'kg', 750, 800, null, 'slaughter', 'sheep', true),
  ('beef', 'Beef', 'kg', 800, 800, 650, 'resale', 'beef', true),
  ('chicken_small', 'Chicken — Small', 'whole bird', 1000, 1000, 500, 'chicken', 'chicken_small', true),
  ('chicken_medium', 'Chicken — Medium', 'whole bird', 1500, 1500, 800, 'chicken', 'chicken_medium', true),
  ('chicken_large', 'Chicken — Large', 'whole bird', 2000, 2000, 1300, 'chicken', 'chicken_large', true)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_products" ON products FOR DELETE TO authenticated USING (true);

CREATE POLICY "service_role_products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
