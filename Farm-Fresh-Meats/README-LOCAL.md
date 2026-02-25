# Run Farm-Fresh-Meats (Enkana) locally

This is the full Replit project: **client** (Vite + React) + **server** (Express) + **Supabase**.

## 1. Install dependencies

```bash
cd Farm-Fresh-Meats
npm install
```

## 2. Run the app

**In a terminal (e.g. Terminal.app or VS Code terminal), from the project root:**

```bash
cd Farm-Fresh-Meats
npm run dev
```

- Server + frontend run on **http://127.0.0.1:5001** (port 5001 to avoid conflict with macOS AirPlay on 5000).
- Open that URL in **Chrome, Safari, or Firefox** (Cursor’s built-in browser may not work with the Vite dev server).
- Admin login: **email** `admin@enkanafresh.com`, **password** `enkana2024`.

**If the page is blank or “not loading”:**

1. Use **http://127.0.0.1:5001** (not `localhost`) in a normal browser (Chrome/Safari/Firefox).
2. Or run the **production build** (no Vite, works in more environments):
   ```bash
   cd Farm-Fresh-Meats
   npm run build
   npm start
   ```
   Then open **http://127.0.0.1:5001** again.

## 3. Env vars

A **`.env`** file was created from your Replit config (Supabase, admin, M-Pesa sandbox). For admin login to work, **`SUPABASE_SERVICE_ROLE_KEY`** must be the real **service_role** key from Supabase (Project settings → API → `service_role` secret). The anon key cannot create users. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` to match the credentials you use on the login form.

## 4. Matching Replit styling and behaviour

- **Styling:** The repo now defines the missing CSS variables `--enkana-card-accent` and `--enkana-card-accent-2` used by `.enkana-card`, so card gradients and accents match the Replit look.
- **Env:** Use the same `.env` values as on Replit (Supabase URL/keys, `ADMIN_EMAIL` / `ADMIN_PASSWORD`) so API and auth behave the same.
- **Replit base path:** If the app on Replit was served under a path (e.g. `/Farm-Fresh-Meats/`), add `base: process.env.BASE_PATH || '/'` in `vite.config.ts` and set `BASE_PATH` when building or running so asset and route paths match.
- **Code in sync:** If styling or features still differ, the Replit project may have newer or different code. Re-export the full project from Replit (Download / Version history) and replace this folder, or keep both in sync via git.

**Dashboard (Orders, Customers, Payments, Reports):** The admin app now uses the same Enkana theme as the website: sidebar and main area use theme colors (`--sidebar-*`, `--primary`, `--accent`), cards use `enkana-card`, `enkana-icon-box`, and `ring-soft`, and pages use `enkana-section-green` for a consistent background. If your Replit dashboard had extra features (e.g. different filters, charts, or workflows), you’ll need to bring that code from Replit into this repo—this codebase has the features listed above; any additions on Replit must be copied over.

## 5. Build for production (e.g. cPanel)

```bash
npm run build
```

The built site goes into `dist/`. You can copy `dist/public` (and run the Node server) or use the static build with your own server.
