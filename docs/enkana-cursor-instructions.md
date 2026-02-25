# ENKANA FRESH — Admin Dashboard Cursor Build Instructions

**Version 1.0 | February 2026**

This document is a complete specification for building and extending the Enkana Fresh admin dashboard. Use the relevant section as a prompt in Cursor when working on each feature. Each section includes business context, data model, UI requirements, and calculation logic.

---

## 1. Tech Stack & Project Context

Provide this context at the start of every Cursor session:

- **Framework:** React (Next.js or Vite)
- **Styling:** Tailwind CSS or inline styles
- **Database:** Supabase (PostgreSQL) or your existing backend
- **Design language:** Dark forest green (#1a3a2a) + warm cream (#f5f0e8) + amber (#e9a82a)
- **Font:** Georgia serif for headings, system sans for data

The app is a farm-to-table butcher delivery admin dashboard for Enkana Fresh, a premium grass-fed beef and livestock delivery service in Nairobi, Kenya. It manages monthly subscription orders, sourcing requisitions, slaughter actuals, and profit margin tracking. All prices are in **Kenyan Shillings (KES)**.

---

## 2. Product Catalogue & Pricing

Master product list. Store in a products table or constants file. Support **promo_price** and **standard_price** per product, with a global toggle to switch between them.

| Product | Unit | Promo Price | Std Price | Cost Price | Sourcing |
|---------|------|-------------|------------|-------------|----------|
| Goat Meat | per kg | KES 750 | KES 800 | Variable* | Own slaughter |
| Mutton | per kg | KES 750 | KES 800 | Variable* | Own slaughter |
| Beef | per kg | KES 800 | KES 800 | KES 650/kg | Local butcher |
| Chicken – Small | whole bird | KES 1,000 | KES 1,000 | KES 500 | Own slaughter |
| Chicken – Medium | whole bird | KES 1,500 | KES 1,500 | KES 800 | Own slaughter |
| Chicken – Large | whole bird | KES 2,000 | KES 2,000 | KES 1,300 | Own slaughter |

*Goat and mutton cost is variable — calculated per delivery cycle from actual animal purchase price and slaughter yield. See Section 5.

**Cursor prompt:** Create a products constants file with the catalogue above. Each product: `id`, `name`, `unit`, `promoPrice`, `standardPrice`, `costPrice` (null for variable), `sourcingType` (slaughter | resale | chicken), `animalType` (goat | sheep | chicken_small | chicken_medium | chicken_large | null). Add global **PRICING_MODE** (promo | standard). When PRICING_MODE changes, all new orders use the updated price. Existing orders lock price at order creation.

---

## 3. Order Creation — New Order Flow

Update the New Order form to support the full product catalogue including chicken size selection and correct pricing.

### 3.1 Order Form Fields

- Customer name, phone number, delivery zone (Nairobi area)
- Delivery date selector
- Line items: product selector → quantity → auto-populated unit price
- **Kienyeji Chicken:** prompt size selector (Small / Medium / Large) before quantity and price
- **Goat Meat and Mutton:** quantity in kg, price locked at active PRICING_MODE
- **Beef:** quantity in kg at KES 800
- Order total auto-calculated
- Payment status: Unpaid / Paid / Partial
- Notes for delivery instructions

### 3.2 Customer Pricing Lock

When a customer places their first order, store **locked_price_mode** (promo or standard) on their profile. All future orders for that customer default to their locked price. Store **unit_price_at_order_time** on each line item so historical orders are not affected by future price changes.

**Cursor prompt:** Update the New Order form for all products. For Kienyeji Chicken, show size picker (Small / Medium / Large) and set correct unit price. Auto-populate unit price from catalogue based on customer's locked_price_mode. Real-time order total. Store unit_price_at_order_time on each line item.

---

## 4. Requisition Report (Orders Submenu)

New screen under Orders. Aggregates orders for a given delivery date and calculates what needs to be sourced: live animals, chickens, beef kg.

### 4.1 Calculation Logic

- **Goat / Mutton:** Average yield 10–15 kg (use 11 kg default). **Animals required = CEILING(total kg ÷ 11)**. Goat and mutton never pooled (allergy-critical).
- **Chicken:** Direct count (e.g. Chicken Large x3 = 3 large birds).
- **Beef:** Total kg to order from butcher.

### 4.2 Requisition Table

| Animal / Product | Orders | Required | Est. Sourcing Cost | Status |
|------------------|--------|----------|--------------------|--------|
| Goats | X kg | N animals | KES 6,750–7,500 × N | Pending / Sourced |
| Sheep | X kg | N animals | KES 6,750–7,500 × N | Pending / Sourced |
| Beef | X kg | X kg | KES 650 × X | Pending / Ordered |
| Chicken – Small/Medium/Large | N birds | N birds | Cost × N | Pending / Sourced |

### 4.3 Status Workflow

- Status: Pending Sourcing → Sourced → Slaughtered / Delivered
- Admin can update status inline. Row turns green when Sourced/Delivered.
- Filter by delivery date (date picker at top).

**Cursor prompt:** Create Requisition Report under Orders with delivery date picker. Aggregate orders by product. For goat/mutton use CEILING(kg ÷ 11) separately. Show estimated sourcing cost (KES 6,750–7,500 per animal). Inline status dropdown. Green highlight for Sourced/Slaughtered. Summary footer with total estimated sourcing spend.

---

## 5. Profit Margin Tracker

New screen (Reports or submenu of Requisition). Three tabs: **Requisition**, **Actuals**, **Summary**.

### 5.1 Data Model — Delivery Cycle

- `delivery_date`
- `orders` (linked order line items)
- `animal_purchases`: array of { product, cost_kes, yield_kg }
- `beef_order_kg`

### 5.2 Calculation Logic

- **Cost per kg (goat/mutton):** SUM(animal_cost) ÷ SUM(yield_kg)
- **Revenue:** ordered_kg × sell_price_at_order_time
- **Cost (slaughter):** ordered_kg × cost_per_kg from actuals
- **Cost (beef):** ordered_kg × 650
- **Cost (chicken):** bird_count × cost_per_bird
- **Gross Margin:** Revenue − Cost
- **Margin %:** (Gross Margin ÷ Revenue) × 100

### 5.3 Animal Purchase Tiers

| Purchase Price | Expected Yield | Cost/kg | Margin/kg at KES 750 |
|----------------|----------------|---------|----------------------|
| KES 6,000 | 10 kg | KES 600 | KES 150 (25%) |
| KES 6,750 | 13 kg | KES 519 | KES 231 (44%) ← Best value |
| KES 7,500 | 14–15 kg | KES 500–536 | KES 214–250 (40%) |

Warn if cost_per_kg exceeds KES 580 for any animal.

### 5.4 Price Simulator

Summary tab: inputs for goat/mutton sell price (default promo), recalculates margin in real time. Include "Set KES 800" shortcut to test price increase impact.

**Cursor prompt:** Build Profit Margin Tracker with Requisition, Actuals, Summary tabs. Actuals: admin enters each animal (cost, yield); system calculates cost_per_kg, margin_per_kg; warn if cost_per_kg > 580. Summary: P&L per product, Revenue/Cost/Margin% colour-coded (green ≥40%, amber ≥20%, red <20%). Price simulator. Multiple delivery cycles with date selector.

---

## 6. Customer Profile Enhancements

Extend customer record:

- name, phone, delivery_zone
- **locked_price_mode:** promo | standard (set on first order)
- first_order_date, last_order_date
- total_orders, total_spend_kes, average_order_value
- **preferred_products:** top 2 by frequency from order history
- notes (admin)

**Cursor prompt:** Extend customer profile with locked_price_mode, lifetime spend, order count, last order date, preferred products (top 2), delivery zone, admin notes. Customer list badge for promo vs standard.

---

## 7. Dashboard Metrics Upgrade

| Metric | Definition |
|--------|------------|
| Total Revenue | SUM of all paid orders |
| Pending KES | SUM of unpaid/pending orders |
| Next Delivery | Orders count and date for next delivery |
| Avg Order Value | Total revenue ÷ order count |
| Gross Margin % | From most recent completed cycle (Margin Tracker) |
| Repeat Customers % | Customers with 2+ orders ÷ total customers |

Each card clickable → relevant detail screen.

**Cursor prompt:** Replace dashboard cards with the six metrics above; each card links to the relevant screen.

---

## 8. Delivery Logistics View

New screen under Orders: **Delivery Dispatch**. Group orders by delivery zone for batching.

- Filter by delivery date
- Group by Nairobi zone (Kileleshwa, Karen, Westlands, Kilimani, etc.)
- Per order: customer name, phone, address, items, total, payment status
- Inline "Mark Delivered" → status Delivered + timestamp
- Header: total orders for day, undelivered count

**Cursor prompt:** Create Delivery Dispatch under Orders. Group by delivery_zone. List orders with name, phone, items, total KES, payment status. Inline Mark Delivered. Header with total and pending count.

---

## 9. M-Pesa Payment Integration

Replace passive "Request Payment" with **M-Pesa STK Push** (Safaricom Daraja API).

1. Admin clicks Request Payment → STK Push to customer phone
2. Order status: "Payment Requested" + timestamp
3. Daraja callback → order auto-updates to Paid (or Failed + reason)
4. Retry allowed on failure

Store Daraja credentials in environment variables (Consumer Key, Consumer Secret, Short Code, Passkey). Use sandbox in development.

**Cursor prompt:** Implement M-Pesa STK Push via Daraja API. Request Payment → OAuth → STK Push. Callback endpoint updates order to Paid (receipt) or Failed. Show status on order card. Store M-Pesa transaction IDs. Env vars for all credentials.

---

## 10. Updated Navigation Structure

| Menu Item | Sub-items |
|-----------|-----------|
| Dashboard | Updated metric cards (Section 7) |
| Orders | All Orders, Requisition Report, Delivery Dispatch |
| Margin Tracker | Per-cycle P&L with actuals entry |
| Customers | Customer list with profiles (Section 6) |
| Payments | Payment history, M-Pesa transactions |
| Products | Catalogue with promo/standard price toggle |
| Reports | Revenue by period, margin trends, product mix |

---

*Enkana Fresh — Confidential Build Document — v1.0 February 2026*
