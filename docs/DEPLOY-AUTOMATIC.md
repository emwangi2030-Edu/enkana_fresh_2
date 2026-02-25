# Automatic deploy: GitHub → cPanel + Supabase

When you **push to `main`**, the following happens automatically.

---

## 1. What gets deployed

| You push | What happens |
|----------|----------------|
| **Any change** (static files or Farm-Fresh-Meats app) | GitHub has the latest code. |
| **cPanel (every 5 min, or your cron interval)** | Pulls from GitHub and runs `.cpanel.yml`: copies static site to `public_html` and **builds** the Farm-Fresh-Meats app. |
| **GitHub Actions** | Runs on every push: **builds** the app (validates it). Optionally runs **database migrations** if you set secrets (see below). |

So: **push to `main`** → within a few minutes the live site and app on cPanel are updated. No need to log in to cPanel to deploy.

---

## 2. Static site (cPanel)

These are copied to `public_html` on every deploy:

- `index.html`, `.htaccess`, `robots.txt`, `sitemap.xml`
- `assets/`, `login/`, `dashboard/`

Any edit to these files, once pushed to `main`, will go live after the next cPanel cron run.

---

## 3. Farm-Fresh-Meats app (cPanel)

- `.cpanel.yml` runs: `cd Farm-Fresh-Meats && npm ci && npm run build`
- So the **built** app (client + server bundle) is ready in the repo on the server.
- You must have **Node.js** enabled in cPanel (e.g. **Setup Node.js App**) and point the application root to the `Farm-Fresh-Meats` folder (or the repo path that contains it). Then the Node server serves the built client and API.
- After each deploy, **restart the Node app** in cPanel if it doesn’t auto-restart (e.g. “Restart” in Setup Node.js App).

If Node isn’t available when the deploy runs, the build step in `.cpanel.yml` will fail; enable Node.js in cPanel and re-run the deploy.

---

## 4. Supabase (database)

The app already uses **Supabase** for data (orders, customers, payments, auth). Supabase is in the cloud; there are no “database files” to copy. Schema and data live in your Supabase project.

- **Schema changes** (new tables, columns): do them in the **Supabase Dashboard** (SQL or Table Editor), or use **Supabase CLI** migrations and run them from your machine or CI.
- **GitHub Actions** can run migrations for you on each push if you want:
  - **Drizzle**: In the repo, Farm-Fresh-Meats has `npm run db:push`. To run it in CI, add a **secret** in GitHub: **Settings → Secrets and variables → Actions** → `DATABASE_URL` = your Supabase **database connection string** (Postgres URL from Supabase: Project settings → Database). Then set a repo variable **`RUN_DB_MIGRATE`** = `true` (or leave `DATABASE_URL` set and the workflow will run the step). You must have a Drizzle config and schema in the repo for `db:push` to work.
  - **Supabase CLI**: If you use `supabase db push` or migration files, add a **secret** `SUPABASE_ACCESS_TOKEN` and a step in `.github/workflows/deploy.yml` that runs the Supabase CLI.

If you don’t set any of these secrets, the workflow still runs the **build**; only the optional DB step is skipped.

---

## 5. One-time setup checklist

- [ ] **cPanel**: Git Version Control clone + deploy key (see [GITHUB-SSH-SETUP.md](GITHUB-SSH-SETUP.md) / [CPANEL-GITHUB-DEPLOY.md](CPANEL-GITHUB-DEPLOY.md)).
- [ ] **cPanel**: Cron job that runs every 5 (or 15) minutes:  
  `cd /home/enkanafresh/repos/YOUR_REPO_NAME && git pull origin main && /usr/bin/uapi VersionControlDeployment create repository_root=/home/enkanafresh/repos/YOUR_REPO_NAME`  
  (replace `YOUR_REPO_NAME` with the real path from Git Version Control.)
- [ ] **cPanel**: Node.js app (Setup Node.js App) pointing to the folder that contains `Farm-Fresh-Meats` (or the repo root if the app root is set to `Farm-Fresh-Meats`), with `npm start` and the right env vars (e.g. `PORT`, `NODE_ENV`, Supabase keys).
- [ ] **GitHub** (optional): To run DB migrations on push, add secret `DATABASE_URL` (Supabase Postgres URL) and, if you want, variable `RUN_DB_MIGRATE` = `true`.

---

## 6. Summary

- **Static files and app code**: Edit in Cursor → commit → push to `main` → cPanel cron pulls and runs `.cpanel.yml` → static site updated, Farm-Fresh-Meats built. Restart Node app in cPanel if needed.
- **Supabase**: Data and auth stay in Supabase; schema can be changed in the Dashboard or via migrations. Optionally run Drizzle or Supabase CLI migrations from GitHub Actions by setting the secrets above.
