# ENKANA FRESH — Admin Dashboard Build Instructions

**Version 1.1** | February 2026 | Includes Section 6.2: Scaled Customer Management

---

## 1. Tech Stack & Project Context

Provide this context at the start of every Cursor session:

- **Framework:** React (Next.js or Vite)
- **Styling:** Tailwind CSS or inline styles
- **Database:** Supabase (PostgreSQL) or your existing backend
- **Design language:** Dark forest green (#1a3a2a) + warm cream (#f5f0e8) + amber (#e9a82a)
- **Font:** Georgia serif for headings, system sans for data

The app is a farm-to-table butcher delivery admin dashboard for Enkana Fresh, a premium grass-fed beef and livestock delivery service in Nairobi, Kenya. It manages monthly subscription orders, sourcing requisitions, slaughter actuals, and profit margin tracking. All prices are in Kenyan Shillings (KES).

---

## 2. Product Catalogue & Pricing

Master product list. Store in a products table or constants file. The system must support a `promo_price` and `standard_price` per product, with a global toggle to switch between them.

| Product | Unit | Promo Price | Std Price | Cost Price | Sourcing |
|---------|------|-------------|-----------|------------|----------|
| Goat Meat | per kg | KES 750 | KES 800 | Variable* | Own slaughter |
| Mutton | per kg | KES 750 | KES 800 | Variable* | Own slaughter |
| Beef | per kg | KES 800 | KES 800 | KES 650/kg | Local butcher |
| Chicken — Small | whole bird | KES 1,000 | KES 1,000 | KES 500 | Own slaughter |
| Chicken — Medium | whole bird | KES 1,500 | KES 1,500 | KES 800 | Own slaughter |
| Chicken — Large | whole bird | KES 2,000 | KES 2,000 | KES 1,300 | Own slaughter |

**Note:** *Goat and mutton cost is variable — calculated per delivery cycle from actual animal purchase price and slaughter yield. See Section 5.

**Cursor prompt:** Create a products constants file with the catalogue above. Each product should have: id, name, unit, promoPrice, standardPrice, costPrice (null for variable), sourcingType (slaughter | resale | chicken), and animalType (goat | sheep | chicken_small | chicken_medium | chicken_large | null). Add a global PRICING_MODE variable (promo | standard) that switches the active sell price across the app. When PRICING_MODE changes, all new orders must use the updated price. Existing orders must lock in the price at time of order creation.

---

## 3. Order Creation — New Order Flow

The current 'New Order' button opens a form. The form must be updated to support the full product catalogue including chicken size selection and correct pricing.

### 3.1 Order Form Fields

- Customer name, phone number, delivery zone (Nairobi area)
- Delivery date selector
- Line items: product selector → quantity → auto-populated unit price
- For Kienyeji Chicken: selecting chicken must prompt a size selector (Small / Medium / Large) before setting quantity and price
- For Goat Meat and Mutton: quantity is in kg, price locked at active PRICING_MODE price
- For Beef: quantity in kg at KES 800
- Order total auto-calculated
- Payment status: Unpaid / Paid / Partial
- Notes field for delivery instructions

### 3.2 Customer Pricing Lock

When a customer places their first order, their `locked_price_mode` (promo or standard) is stored on their customer profile. All future orders for that customer default to their locked price, even if the global PRICING_MODE has changed.

**Cursor prompt:** Update the New Order form to support all products in the catalogue. When the user selects Kienyeji Chicken, show a size picker (Small / Medium / Large) that sets the correct unit price. Auto-populate unit price from the product catalogue based on the customer's locked_price_mode. Calculate and display order total in real time. Store unit_price_at_order_time on each line item so historical orders are not affected by future price changes.

---

## 4. Requisition Report (Orders Submenu)

New screen under the Orders menu. Aggregates all orders for a given delivery date and calculates exactly what needs to be sourced — live animals, chickens, and beef kg.

### 4.1 Calculation Logic

- Goat Meat and Mutton orders are in kg. To convert to live animals: average yield per animal 10–15 kg (use 11 kg default). Animals required = CEILING(total kg ordered ÷ 11). Goat and mutton must never be pooled.
- Chicken: count is direct (e.g. Chicken Large x3 = 3 large birds).
- Beef: show total kg to order from butcher.

### 4.2 Requisition Table Structure

Animal/Product | Orders | Required | Est. Sourcing Cost | Status  
Goats | X kg | N animals | KES 6,750–7,500 × N | Pending / Sourced  
Sheep | X kg | N animals | KES 6,750–7,500 × N | Pending / Sourced  
Beef | X kg | X kg | KES 650 × X | Pending / Ordered  
Chicken Small/Medium/Large | N birds | N birds | per bird cost | Pending / Sourced  

### 4.3 Status Workflow

Each row: Pending Sourcing → Sourced → Slaughtered / Delivered. Admin can update status inline. Row turns green when Sourced/Delivered. Report filtered by delivery date.

**Cursor prompt:** Create a Requisition Report screen as a submenu under Orders. Delivery date picker at top. For selected date, aggregate quantities per product. CEILING(kg ÷ 11) for goat and mutton separately. Inline status dropdown per row. Summary footer with total estimated sourcing spend.

---

## 5. Profit Margin Tracker

New screen (Reports menu or submenu of Requisition). Three tabs: Requisition, Actuals, Summary.

### 5.1 Data Model — Delivery Cycle

- delivery_date, orders (line items), animal_purchases (product, cost_kes, yield_kg), beef_order_kg.

### 5.2 Calculation Logic

- Cost per kg (goat/mutton): SUM(animal_cost) ÷ SUM(yield_kg)
- Revenue: ordered_kg × sell_price_at_order_time
- Cost (slaughter): ordered_kg × cost_per_kg; Cost (beef): ordered_kg × 650; Cost (chicken): bird_count × cost_per_bird
- Gross Margin = Revenue − Cost; Margin % = (Gross Margin ÷ Revenue) × 100

### 5.3 Animal Purchase Tiers

Purchase KES 6,000 → 10 kg → cost/kg KES 600 (warn if cost_per_kg > 580). KES 6,750 → 13 kg (best value). KES 7,500 → 14–15 kg.

### 5.4 Price Simulator

Summary tab: price simulator for goat/mutton sell price; recalculates margin in real time. 'Set KES 800' shortcut.

**Cursor prompt:** Build Profit Margin Tracker with three tabs (Requisition, Actuals, Summary). Actuals: enter animal cost and yield; warn if cost_per_kg > 580. Summary: P&L per product, margin % colour-coded (green ≥40%, amber ≥20%, red <20%). Price simulator. Date selector for multiple delivery cycles.

---

## 6. Customer Profile Enhancements

### 6.1 Customer Record Fields

name, phone, delivery_zone, locked_price_mode (promo | standard), first_order_date, last_order_date, total_orders, total_spend_kes, average_order_value, preferred_products (top 2 by frequency), notes.

**Cursor prompt:** Extend customer profile with locked_price_mode, lifetime spend, order count, last order date, preferred products, delivery zone, admin notes. Customer list badge for promo vs standard.

### 6.2 Scaled Customer List View (100+ Customers)

#### 6.2.1 List / Card View Toggle

Toggle (List / Cards) top-right; default **List**. Card view retained as secondary.

#### 6.2.2 Customer List Columns

Name (with initials), Phone, Delivery Zone, Pricing Tier badge, Total Orders, Lifetime Spend (KES), Last Order Date, Health Status dot, Preferred Products (profile), Admin Notes (profile). Sortable where noted.

#### 6.2.3 Health Status System

- **Active:** ordered within 30 days — green dot  
- **At Risk:** 31–60 days — amber dot  
- **Lapsed:** 60+ days — red dot  
- **New:** only 1 order — blue dot  

Derive dynamically from last_order_date; do not store.

#### 6.2.4 Filter Chips

Delivery Zone, Pricing Tier, Health Status, Order Count (First-time / Repeat 2+ / Loyal 5+), Preferred Product. Multiple chips = AND logic.

#### 6.2.5 Search

Name, phone, delivery zone, admin notes. Highlight matches.

#### 6.2.6 Sortable Columns & Default Sort

Default sort: Lifetime Spend descending; secondary: Last Order Date descending. Sort state persists for session.

#### 6.2.7 Bulk Actions

Checkbox column; when selected: Export CSV, Send WhatsApp (wa.me links), Tag/Label, Merge duplicates (phone match).

#### 6.2.8 Duplicate Detection

Exact phone → block creation, show existing, offer merge. Same name + same zone → warn. Similar name → flag for review. 'Review Duplicates' queue under Customers.

#### 6.2.9 Customer Tags

Free-form tags (e.g. Restaurant, Diaspora, VIP). Chips on card/list; filterable.

#### 6.2.10 Pagination & Performance

Server-side pagination; default 25, options 25 / 50 / 100. Total count in header.

**Cursor prompt:** Upgrade Customers for scale: List/Cards toggle (default List), sortable paginated table (25 per page, server-side), columns per 6.2.2, default sort Lifetime Spend desc. Filter chips (Zone, Pricing Tier, Health Status, Order tier, Preferred Product). Search: name, phone, zone, notes. Health Status dynamic. Bulk select: Export CSV, WhatsApp, Add Tag, Flag Duplicate. New customer: check phone match; block and offer merge. Same name+zone: warn. Tags on customer record; filter chips. 'Review Duplicates' in Customers submenu.

---

## 7. Dashboard Metrics Upgrade

Replace/extend with: Total Revenue (paid), Pending KES, Next Delivery (count + date), Avg Order Value, Gross Margin % (link to Margin Tracker), Repeat Customers %. Each card clickable to relevant screen.

**Cursor prompt:** Replace dashboard metric cards with the six metrics above; each card links to the relevant detail screen.

---

## 8. Delivery Logistics View

New screen under Orders: Delivery Dispatch. Filter by delivery date; group by delivery zone. Per order: name, phone, address, items, total, payment status. Inline 'Mark Delivered'. Header: total orders for day, undelivered count.

**Cursor prompt:** Create Delivery Dispatch under Orders. Group by zone; list orders with details; Mark Delivered inline; header with totals.

---

## 9. M-Pesa Payment Integration

Request Payment → M-Pesa STK Push via Daraja API. On callback: order → Paid. Store transaction IDs. Credentials in env.

**Cursor prompt:** Implement M-Pesa STK Push; callback updates order; show status on order card; env for Daraja credentials.

---

## 10. Updated Navigation Structure

| Menu Item    | Sub-items / Notes |
|-------------|-------------------|
| Dashboard   | Updated metric cards (§7) |
| Orders      | All Orders, Requisition Report, Delivery Dispatch |
| Margin Tracker | Per-cycle P&L with actuals |
| Customers   | List (List/Card toggle), Profiles, Review Duplicates |
| Payments    | Payment history, M-Pesa transactions |
| Products    | Catalogue with promo/standard toggle |
| Reports     | Revenue by period, margin trends, product mix |

---

*Enkana Fresh — Confidential Build Document — v1.1 February 2026*
