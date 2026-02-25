# Deployment flow: dev → main → GitHub → live site

This document describes the full path from development to the live cPanel site so everything works as expected.

---

## Flow overview

```
  [Your Mac]                    [GitHub]                     [cPanel server]
       |                            |                                |
  work on dev branch                |                                |
       |                            |                                |
  git push origin dev  ---------->  dev updated                      |
       |                            |                                |
  when ready for production:         |                                |
  git checkout main                 |                                |
  git pull origin main              |                                |
  git merge dev                     |                                |
  git push origin main  ---------->  main updated                    |
       |                            |                                |
       |                      .github/workflows/deploy.yml            |
       |                      runs (build validation only)            |
       |                            |                                |
       |                            |  cron every 5 min (or manual):  |
       |                            |  git pull origin main  -------> repo updated
       |                            |  uapi VersionControlDeployment  |
       |                            |       runs .cpanel.yml  -------> npm ci && npm run build
       |                            |                                |
       |                            |                      Restart Node.js app (manual)
       |                            |                                |
       |                            |                      Live site serves new build
```

---

## Step-by-step

### 1. Develop on `dev`

- Do all feature work on the **`dev`** branch.
- Commit and push: `git push origin dev`.
- GitHub holds the latest `dev`; the live site does **not** change.

### 2. Put changes on `main`

For updates to reach the live site, they must be on **`main`**:

```bash
git checkout main
git pull origin main
git merge dev -m "Merge dev: <short description>"
git push origin main
```

- After this, **main** on GitHub has your latest code.
- The live site still has the old version until cPanel deploys (step 4).

### 3. GitHub Actions (optional check)

- On every **push to `main`**, the workflow **`.github/workflows/deploy.yml`** runs.
- It only **validates** the build (`cd Farm-Fresh-Meats && npm ci && npm run build`).
- It does **not** deploy to the server. If this workflow fails, fix the build; the live site is updated by cPanel, not by GitHub Actions.

### 4. cPanel updates the live site

The live site is updated only when cPanel pulls and deploys:

**Option A – Automatic (cron)**

- A cron job runs every 5 (or 15) minutes:
  - `cd REPO_PATH && git pull origin main && uapi VersionControlDeployment create repository_root=REPO_PATH`
- Replace `REPO_PATH` with the path shown in cPanel **Git Version Control** → **Manage** (e.g. `/home/enkanafresh/repositories/enkana_fresh_2` — note some hosts use `repos/`, others `repositories/`).

**Option B – Manual**

- cPanel → **Files** → **Git Version Control** → your repo → **Manage** → **Pull or Deploy**.
- Click **Update from Remote** (pulls latest `main`).
- Click **Deploy HEAD Commit** (runs `.cpanel.yml`).

**.cpanel.yml** does:

1. Copies the static marketing site (e.g. `index.html`, `assets/`, `login/`, `dashboard/`) to `public_html/`.
2. Runs `cd Farm-Fresh-Meats && npm ci && npm run build` so the app build lives in `Farm-Fresh-Meats/dist/`.

The **Node.js application** (Setup Node.js App) serves the admin app (Orders, Customers, Reports, etc.) from that repo directory. After each deploy you should **restart the Node.js app** in cPanel so it serves the new build.

### 5. Confirm on the live site

- Open the **admin app URL** (the one that shows the dashboard/orders — often a subdomain or path, not necessarily the main domain).
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) or use an incognito window.
- A green bar at the top should show the app version (e.g. `App version: 2026-02-25-c9df984`) for a few seconds if you’re on the new build.

---

## Checklist: “I pushed to main but the live site didn’t update”

- [ ] You pushed to **main** (not only to **dev**). If you only pushed to `dev`, merge `dev` into `main` and push `main`.
- [ ] cPanel has run **Update from Remote** and **Deploy HEAD Commit** (wait for cron or do it manually).
- [ ] **Deploy HEAD Commit** completed without errors (if `npm run build` failed, the new app build wasn’t written).
- [ ] You **restarted the Node.js application** in cPanel (Setup Node.js App → Restart).
- [ ] You’re opening the **admin app URL** (Node app), not only the static marketing site.
- [ ] You did a **hard refresh** or used **incognito** to avoid cache.

---

## Where things live

| What | Where |
|------|--------|
| Development branch | `dev` (you push to `origin dev`) |
| Production branch | `main` (cPanel pulls this) |
| Workflow that runs on push to main | `.github/workflows/deploy.yml` (root of repo) — build only |
| Deploy config used by cPanel | `.cpanel.yml` (root of repo) |
| App code | `Farm-Fresh-Meats/` |
| Built app (after deploy) | `Farm-Fresh-Meats/dist/` (Node app serves from here) |
| Static marketing site | Copied to `public_html/` by `.cpanel.yml` |

---

## Note on Farm-Fresh-Meats/.github/workflows/

Workflow files under **Farm-Fresh-Meats/.github/workflows/** are **not** run by GitHub. Only workflows in the **repository root** `.github/workflows/` directory are used. The active deployment workflow is the one in the repo root: **`.github/workflows/deploy.yml`**.
