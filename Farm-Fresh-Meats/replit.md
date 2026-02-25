# Enkana Fresh

## Overview

Enkana Fresh is a fresh food delivery platform built for modern households, starting with meat (beef, goat, mutton, chicken). The app allows customers to place orders via WhatsApp, with support for one-time orders and monthly subscriptions. It features a public-facing landing page and an admin order management dashboard.

The frontend is a React SPA that communicates directly with Supabase (database + auth) using RLS policies. M-Pesa payment processing runs on Supabase Edge Functions. Written in TypeScript. Production hosting: static files on cPanel (enkanafresh.com) + Supabase backend.

## User Preferences

Preferred communication style: Simple, everyday language.
Target hosting: cPanel (enkanafresh.com) with Supabase for database/auth/edge functions.
Domain: enkanafresh.com
Admin credentials: stored in Supabase Auth (admin@enkanafresh.com)

## System Architecture

### Directory Structure
- `client/` — React frontend (Vite-powered SPA)
- `server/` — Express backend (DEVELOPMENT ONLY — used as Vite dev server host, not needed in production)
- `shared/` — Shared TypeScript types and Zod schemas
- `supabase/functions/` — Supabase Edge Functions (M-Pesa payment processing)
- `supabase/migrations/` — SQL migration files for Supabase SQL Editor
- `scripts/` — Build and deployment scripts
- `attached_assets/` — Design reference files

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite (dev server on port 5000)
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Animations**: Framer Motion
- **Fonts**: DM Sans (body) and Fraunces (display/headings)
- **Auth**: Supabase Auth via `@supabase/supabase-js` — JWT-based, stored in browser
- **Data Layer**: `client/src/lib/supabase-data.ts` — all CRUD operations use direct Supabase client calls (no API proxy)
- **Pages**:
  - `/` — Landing page (hero, product categories, how it works, CTA)
  - `/login` — Admin login page (email/password via Supabase Auth)
  - `/dashboard` — Admin dashboard with sidebar layout
  - `/dashboard/orders` — Order management with statistics and CRUD
  - `/dashboard/customers` — Customer list with search and stats
  - `/dashboard/customers/:id` — Customer details with order history
  - `/dashboard/payments` — Payments page with M-Pesa payment records and exceptions
  - `/dashboard/reports` — Monthly reports with Excel/PDF export
- **Layout**: Dashboard pages use `DashboardLayout` component with collapsible sidebar navigation

### Backend Architecture (Production)
- **No Express server in production** — frontend is a static SPA
- **Database**: Direct Supabase client calls from frontend with RLS policies
- **M-Pesa**: Supabase Edge Functions handle STK Push, callback, and status queries
- **Edge Functions** (in `supabase/functions/`):
  - `mpesa-stkpush` — Initiates M-Pesa STK Push payment (authenticated)
  - `mpesa-callback` — Receives Safaricom callback after payment (no JWT verification)
  - `mpesa-status` — Queries STK Push payment status (authenticated)
  - `_shared/mpesa-utils.ts` — Shared M-Pesa utilities (token, password, phone formatting)

### Backend Architecture (Development Only)
- Express server hosts Vite dev server with HMR
- Express routes still exist in `server/routes.ts` but are NOT used by the frontend
- Frontend always calls Supabase directly via `supabase-data.ts`

### Database
- **Provider**: Supabase (hosted PostgreSQL)
- **Client**: `@supabase/supabase-js` (anon key for frontend, service role key for Edge Functions)
- **Schema** (managed via Supabase SQL Editor):
  - `customers` table: id (UUID), name, phone, location, location_pin, created_at
  - `orders` table: id (UUID), customer_id, customer_name, phone, items (JSONB), total_amount, status, payment_status, mpesa_transaction_id, mpesa_checkout_request_id, paid_at, notes, delivery_month, created_at
  - `payments` table: id (UUID), order_id, mpesa_transaction_id, amount, phone_number, transaction_date, merchant_request_id, checkout_request_id, result_code, result_desc, created_at
  - `payment_exceptions` table: id (UUID), mpesa_transaction_id, checkout_request_id, amount, phone_number, result_code, result_desc, reason, resolved, created_at
- **RLS**: Row Level Security enabled on all tables. Authenticated users get full CRUD. Service role bypasses RLS (for Edge Functions). Migration file: `supabase/migrations/001_rls_admin_policies.sql`
- **Column naming**: snake_case in DB, camelCase in TypeScript (auto-converted in `supabase-data.ts`)

### Authentication
- **Provider**: Supabase Auth
- **Admin User**: admin@enkanafresh.com
- **Flow**: Email/password login → Supabase returns JWT → stored in browser → sent as Bearer token to Edge Functions
- **Frontend**: Uses `supabase.auth.signInWithPassword()` directly (no server proxy)

### Dev/Production Setup
- **Development**: `npm run dev` — Express hosts Vite dev server on port 5000
- **Production Build**: `scripts/build-static.sh` or `npx vite build` — outputs static files to `dist/public/`
- **cPanel Deployment**: Upload `dist/public/` contents to `public_html/` on cPanel. `.htaccess` included for SPA routing.
- **Edge Functions Deployment**: Via Supabase CLI:
  - `supabase functions deploy mpesa-stkpush`
  - `supabase functions deploy mpesa-callback --no-verify-jwt`
  - `supabase functions deploy mpesa-status`

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets` → `attached_assets/`

## External Dependencies

### Required Services
- **Supabase**: PostgreSQL database, Auth, RLS, and Edge Functions

### Environment Variables / Secrets
- `VITE_SUPABASE_URL` — Supabase URL exposed to Vite frontend (set in `client/.env`)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key exposed to Vite frontend (set in `client/.env`)
- Edge Functions secrets (set via Supabase Dashboard > Edge Functions > Secrets):
  - `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`
  - `MPESA_ENVIRONMENT` — `sandbox` or `production`
  - `MPESA_CALLBACK_URL` — URL of the mpesa-callback Edge Function
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — auto-injected by Supabase

### Key npm Packages
- **@supabase/supabase-js**: Database client and auth
- **@tanstack/react-query**: Client-side data fetching and caching
- **wouter**: Client-side routing
- **framer-motion**: Page animations
- **shadcn/ui** (Radix UI + Tailwind): Component library
- **zod**: Schema validation
- **xlsx**: Excel export for reports
- **jspdf** + **jspdf-autotable**: PDF export for reports

### M-Pesa Integration
- **Service**: Safaricom Daraja API (M-Pesa Express / STK Push)
- **Implementation**: Supabase Edge Functions (`supabase/functions/`)
- **Flow**: Admin clicks "Request Payment" → Frontend calls `mpesa-stkpush` Edge Function → STK Push sent to customer's phone → Customer enters PIN → Safaricom sends callback to `mpesa-callback` Edge Function → Order marked as paid, payment recorded
- **Callback URL**: Set via `MPESA_CALLBACK_URL` env var in Supabase Edge Functions secrets

### WhatsApp Integration
- The landing page includes WhatsApp order CTAs, linking to WhatsApp for direct ordering. This is a link-based integration, not an API integration.

## Migration Roadmap
- **Phase 1 (DONE)**: Switch database + auth from Replit PostgreSQL/sessions to Supabase
- **Phase 2 (DONE)**: Migrate frontend from Express API proxy to direct Supabase client calls
- **Phase 3 (DONE)**: Create Supabase Edge Functions for M-Pesa (replaces Express M-Pesa routes)
- **Phase 4 (DONE)**: Static SPA build configuration for cPanel deployment
- **Phase 5 (PLANNED)**: Deploy to cPanel + deploy Edge Functions to Supabase
- **Phase 6 (PLANNED)**: Add Cloudflare CDN/WAF, Africa's Talking WhatsApp API, Claude AI intelligence

## Deployment Checklist (cPanel)
1. Run RLS migration in Supabase SQL Editor: `supabase/migrations/001_rls_admin_policies.sql`
2. Deploy Edge Functions via Supabase CLI (set M-Pesa secrets first)
3. Build static site: `scripts/build-static.sh`
4. Upload `dist/public/` contents to cPanel `public_html/`
5. Verify `.htaccess` SPA routing works
6. Set `MPESA_CALLBACK_URL` in Supabase Edge Functions secrets to `https://ytigqomptszifqyyflya.supabase.co/functions/v1/mpesa-callback`
