# Enkana Build Instructions v1.1 — Implementation Status

This checklist maps **docs/ENKANA-BUILD-INSTRUCTIONS-V1.1.md** to the current Farm-Fresh-Meats codebase. Use it to prioritize next work.

---

## Summary

| Section | Status | Notes |
|--------|--------|--------|
| §1 Tech stack | ✅ | Vite, React, Tailwind, Supabase |
| §2 Product catalogue & PRICING_MODE | ✅ | PRODUCT_CATALOGUE, PRICING_MODE, getActivePrice; Products page with toggle |
| §3 Order form (full catalogue, chicken sizes, lock price) | 🟡 | Full catalogue + getActivePrice + customer locked mode; chicken size picker UI pending |
| §4 Requisition Report | 🟡 | Placeholder route + nav; full aggregation pending |
| §5 Margin Tracker (tabs, actuals, simulator) | 🟡 | EnkanaMarginTracker exists; align with §5 (actuals, cost warning, simulator) |
| §6.1 Customer profile fields | 🟡 | Schema: deliveryZone, lockedPriceMode, notes, tags; DB columns optional |
| §6.2 Scaled customer list | 🟡 | Default List ✅, 25/50/100 ✅, health status dot ✅, sortable ✅, Zone + Pricing columns ✅; filter chips, bulk actions, tags pending |
| §7 Dashboard metrics | ✅ | Revenue tracker on Orders page (6 metrics, clickable) |
| §8 Delivery Dispatch | 🟡 | Placeholder route + nav; full view pending |
| §9 M-Pesa | 🟡 | Request Payment / STK Push exists; Mark as Paid added |
| §10 Navigation | ✅ | Requisition, Delivery Dispatch, Products, Review Duplicates in nav + routes |

**Legend:** ✅ Done | 🟡 Partial | ⬜ Not started

---

## Section-by-section

### §2 Product catalogue & pricing

- **Current:** `shared/schema.ts` has `PRODUCTS` with beef, goat, mutton, chicken (single price). No promo/standard, no chicken sizes.
- **Todo:** Add products constants per §2 (promoPrice, standardPrice, costPrice, sourcingType, animalType). Add global PRICING_MODE and use it in order form.

### §3 Order creation

- **Current:** New Order form uses existing PRODUCTS; no chicken size picker; no locked_price_mode; no unit_price_at_order_time on line items.
- **Todo:** Full catalogue in form; chicken size selector; customer locked_price_mode; store unit price per line item; auto total.

### §4 Requisition Report

- **Current:** No screen.
- **Todo:** New route under Orders; delivery date picker; aggregate by product; CEILING(kg÷11) for goat/mutton; status per row; summary footer.

### §5 Margin Tracker

- **Current:** `enkana-margin-tracker.tsx` exists with tabs/structure.
- **Todo:** Align with §5: Actuals entry (animal cost + yield), cost_per_kg > 580 warning; Summary P&L and margin % colours; price simulator; delivery cycle selector.

### §6.1 Customer profile

- **Current:** Customer: name, phone, location (and locationPin). No locked_price_mode, first/last order dates, preferred_products, or notes in schema.
- **Todo:** Extend Customer schema and UI (detail page + list badge for pricing tier).

### §6.2 Scaled customer list

- **Done:** List/Cards toggle (default Cards in code; §6.2.1 says default List — consider switching), server-side pagination (12/24/48; §6.2.10 says 25/50/100), table view, search (name, phone, location).
- **Todo:** Default sort Lifetime Spend desc + sortable column headers; Delivery Zone column (and field on customer); Pricing Tier badge; Health Status dot (Active/At Risk/Lapsed/New from last_order_date); filter chips (Zone, Pricing Tier, Health, Order count tier, Preferred Product); bulk select + Export CSV, WhatsApp, Tag, Flag duplicate; duplicate detection on create + Review Duplicates queue; Customer tags (schema + chips + filter); page size options 25/50/100; total count in header (“X customers”). Set default view to List if matching §6.2.1.

### §7 Dashboard metrics

- **Done:** Orders page has six metrics (Total Revenue, Pending KES, Next Delivery, Avg Order Value, Gross Margin % link, Repeat Customers %) with links. Dashboard layout may still show older cards; ensure dashboard route uses same metrics or shares component.

### §8 Delivery Dispatch

- **Current:** No screen.
- **Todo:** New route under Orders; date filter; group by delivery_zone; list orders; Mark Delivered inline; header totals.

### §9 M-Pesa

- **Current:** Request Payment (STK Push) and Mark as Paid; order fields for M-Pesa IDs.
- **Todo:** Confirm callback and env credentials per §9; document flow.

### §10 Navigation

- **Current:** Orders (All Orders, Customers), Payments, Reports (Monthly Report, Margin Tracker).
- **Todo:** Add Orders → Requisition Report, Delivery Dispatch; add Customers → Review Duplicates; add Products (catalogue + pricing toggle); adjust Reports if needed.

---

## Suggested order of work

1. **§2 + §3** — Products catalogue and PRICING_MODE; then order form (chicken sizes, locked price, line-item price).
2. **§6.1 + §6.2** — Customer schema (locked_price_mode, delivery_zone, tags, etc.); then list: default List, sortable, health status, filter chips, bulk actions, duplicates, tags.
3. **§4** — Requisition Report.
4. **§5** — Margin Tracker actuals + simulator + alignment.
5. **§8** — Delivery Dispatch.
6. **§10** — Navigation updates (Requisition, Dispatch, Products, Review Duplicates).

Reference: **docs/ENKANA-BUILD-INSTRUCTIONS-V1.1.md**
