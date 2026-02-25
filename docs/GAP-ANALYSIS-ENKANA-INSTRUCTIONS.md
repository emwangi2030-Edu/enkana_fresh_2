# Gap Analysis: App vs enkana-cursor-instructions.md

**Reference:** `docs/enkana-cursor-instructions.md` (v1.0 February 2026)

---

## §1 Tech stack — OK

- React (Vite), Tailwind, Supabase, KES. Design/font partially applied.

---

## §2 Product catalogue — Gaps

| Doc | Current |
|-----|--------|
| Goat 750/800, Mutton 750/800, Beef 800, Chicken Small/Med/Large 1000/1500/2000 | Beef 750, Goat 800, Mutton 850, Chicken 1200 (single) |
| promo_price + standard_price, PRICING_MODE toggle | Single price per product, no promo/standard |
| costPrice, sourcingType, animalType | Not in schema |

**Todo:** Products constants with full catalogue; promo/standard pricing; global PRICING_MODE.

---

## §3 Order creation — Gaps

| Doc | Current |
|-----|--------|
| Delivery zone, delivery date selector | deliveryMonth (YYYY-MM), no zone |
| Chicken size (Small/Medium/Large) before qty/price | Single chicken product |
| unit_price_at_order_time on line items | pricePerUnit stored |
| locked_price_mode on customer, first order locks it | Not implemented |

**Todo:** Chicken size picker; customer locked_price_mode; delivery zone; delivery date (optional).

---

## §4 Requisition report — Missing

| Doc | Current |
|-----|--------|
| New screen under Orders: Requisition Report | Not present |
| Delivery date picker, aggregate by product | — |
| Goat/mutton CEILING(kg÷11), animals required, est. cost | — |
| Status: Pending → Sourced → Slaughtered/Delivered | — |

**Todo:** Add “Requisition Report” under Orders with date picker, aggregation, sourcing cost, status workflow.

---

## §5 Profit margin tracker — Partial

| Doc | Current |
|-----|--------|
| Three tabs: Requisition, Actuals, Summary | Margin Tracker has Requisition, Actuals, Summary |
| delivery_date, animal_purchases, cost_per_kg, margin % | Actuals in localStorage; summary P&L |
| Warn if cost_per_kg > 580 | Implemented |
| Price simulator (sell price, “Set KES 800”) | Partial |

**Todo:** Persist actuals (e.g. DB); multiple delivery cycles; price simulator as in doc.

---

## §6 Customer profile — Gaps

| Doc | Current |
|-----|--------|
| locked_price_mode, first/last order date | Not in customer schema |
| total_orders, total_spend_kes, average_order_value | Not on profile |
| preferred_products (top 2) | Not implemented |
| delivery_zone, notes | location/locationPin, no zone enum |

**Todo:** Extend customer schema and profile UI per §6.

---

## §7 Dashboard metrics — Implemented

| Doc | Current |
|-----|--------|
| Total Revenue (paid only) | Yes |
| Pending KES | Yes |
| Next Delivery (count + date) | Yes |
| Avg Order Value | Yes |
| Gross Margin % (from Margin Tracker) | Card links to Margin Tracker |
| Repeat Customers % | Yes |
| Each card clickable → relevant screen | Yes (Orders, Payments, Margin Tracker, Customers) |

**Done:** Revenue tracker on Orders page matches §7; all six metrics and links in place.

---

## §8 Delivery dispatch — Missing

| Doc | Current |
|-----|--------|
| New screen: Delivery Dispatch under Orders | Not present |
| Group by delivery zone, filter by date | — |
| Mark Delivered inline | — |

**Todo:** Add “Delivery Dispatch” under Orders; group by zone; Mark Delivered.

---

## §9 M-Pesa — Partial

| Doc | Current |
|-----|--------|
| STK Push (Daraja), callback → Paid/Failed | Request payment flow exists; confirm Daraja/callback |
| Env vars for credentials | Check .env |

**Todo:** Verify full STK Push + callback; document env vars.

---

## §10 Navigation — Partial

| Doc | Current |
|-----|--------|
| Dashboard (updated cards) | Orders page has §7 metrics |
| Orders → All Orders, **Requisition Report**, **Delivery Dispatch** | All Orders, Customers only |
| **Margin Tracker** (top-level or Reports) | Under Reports |
| Customers, Payments | Yes |
| **Products** (catalogue + price toggle) | Not present |
| Reports (revenue, margin trends, product mix) | Monthly Report, Margin Tracker |

**Todo:** Add Requisition Report and Delivery Dispatch under Orders; add Products menu and page; align nav labels with doc.

---

*Summary: §7 (Revenue tracker) is aligned. Largest gaps: §2 products/pricing, §4 Requisition Report, §6 customer profile, §8 Delivery Dispatch, §10 nav and Products.*
