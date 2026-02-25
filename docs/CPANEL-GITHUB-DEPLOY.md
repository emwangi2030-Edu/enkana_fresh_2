# Connect GitHub to cPanel (automatic deployment)

When you **push to GitHub**, your live site on cPanel can update automatically. This guide uses cPanel’s **Git Version Control** and a **cron job** to pull from GitHub and deploy on a schedule (e.g. every 5 minutes).

**Full pipeline:** For the end-to-end flow from **dev → main → GitHub → live site**, see **docs/DEPLOYMENT-FLOW.md**.

---

## Dev vs main: changes only go live from main

- **Development** is done on the `dev` branch (you commit and push to `dev`).
- **The live cPanel site** only deploys from the **`main`** branch (cPanel cron runs `git pull origin main`).
- So for any change to appear on the live site you must **merge `dev` into `main` and push `main`**:

  ```bash
  git checkout main
  git pull origin main
  git merge dev -m "Merge dev: <short description>"
  git push origin main
  ```

- After that, either wait for the cPanel cron (e.g. 5 min) or in cPanel run **Update from Remote** then **Deploy HEAD Commit**. The live site will then serve what’s on `main`.

---

## Overview

1. **GitHub** = your source of truth (you push from your Mac).
2. **cPanel** = clones that repo and runs a deploy (copy files to `public_html`) when you trigger it.
3. **“Automatic”** = a cron job in cPanel runs “pull from GitHub + deploy” every X minutes, so changes appear shortly after you push.

Alternative: you can also **manually** click “Update from Remote” and “Deploy” in cPanel after each push if you prefer.

---

## Step 1: Add a Deploy Key (so cPanel can pull from GitHub)

cPanel needs permission to read your GitHub repo. You do that with a **Deploy Key** (SSH key generated in cPanel, added to GitHub).

### 1.1 Generate SSH key in cPanel

1. Log in to **cPanel**.
2. Go to **Security** → **SSH Access**.
3. Under **Public Keys**, click **Generate a New Key**.
4. **Key name:** e.g. `github-deploy`.
5. **Key type:** RSA (or Ed25519 if available).
6. Click **Generate Key**.
7. Click **Manage** next to the new key → **Authorize** (so the key can be used for SSH).

### 1.2 Copy the public key

- In **SSH Access** → **Public Keys** → **Manage** for that key.
- Copy the **entire** public key (starts with `ssh-rsa` or `ssh-ed25519`).

### 1.3 Add it to GitHub as a Deploy Key

1. Open your repo: **https://github.com/emwangi2030-Edu/enkana_fresh_2**
2. **Settings** → **Deploy keys** (in the left sidebar).
3. **Add deploy key**.
4. **Title:** e.g. `cPanel production`.
5. **Key:** paste the public key from cPanel.
6. Leave **“Allow write access”** unchecked (read-only is enough for pull).
7. Click **Add key**.

---

## Step 2: Set your deploy path in the repo

In your project, open **`.cpanel.yml`** and replace `cpanel_username` with your **actual cPanel username** (the one you use to log in to cPanel):

```yaml
- export DEPLOYPATH=/home/cpanel_username/public_html/
```

Example: if your username is `enkanafr`, use:

```yaml
- export DEPLOYPATH=/home/enkanafr/public_html/
```

Commit and push so GitHub has the correct path:

```bash
git add .cpanel.yml
git commit -m "Set cPanel deploy path"
git push origin main
```

---

## Step 3: Create the Git repo in cPanel (clone from GitHub)

1. In cPanel go to **Files** → **Git Version Control**.
2. Click **Create**.
3. **Clone a repository:** Yes.
4. **Repository URL:** use the **SSH** URL:
   ```text
   git@github.com:emwangi2030-Edu/enkana_fresh_2.git
   ```
5. **Repository path:** choose where the clone lives on the server, e.g.:
   ```text
   repos/enkana_fresh_2
   ```
   (cPanel usually uses something like `/home/your_username/repos/enkana_fresh_2`.)
6. **Repository name:** e.g. `enkana_fresh_2`.
7. Click **Create**.

If clone fails with “Permission denied”, double-check the Deploy Key (Step 1) and that you used the **SSH** URL, not HTTPS.

---

## Step 4: Deploy once (and test .cpanel.yml)

1. In **Git Version Control**, find **enkana_fresh_2** → **Manage**.
2. Open the **Pull or Deploy** tab.
3. Click **Update from Remote** (pulls latest from GitHub).
4. Click **Deploy HEAD Commit**.

Check your site in the browser; the files in `public_html` should match the repo. If something is missing, fix `.cpanel.yml` (paths or files), commit, push, then **Update from Remote** and **Deploy HEAD Commit** again.

---

## Step 5: Automatic deploy (cron job)

So that every push to GitHub is deployed without you opening cPanel each time, run “pull + deploy” on a schedule.

1. In cPanel go to **Advanced** → **Cron Jobs**.
2. **Add New Cron Job.**
3. **Schedule:** e.g. **Every 5 minutes** (or “Every 15 minutes” if you prefer).
4. **Command:** use the **exact Repository Path** from Git Version Control (Manage). The cron must (1) pull from GitHub and (2) run the deploy. Replace `REPO_PATH` with that path. The path is shown in cPanel when you click **Manage** (e.g. `/home/enkanafresh/repositories/enkana_fresh_2` or `/home/enkanafresh/repos/enkana_fresh_2` — hosts vary between `repos` and `repositories`).

   **Standard cPanel (one line):**
   ```bash
   cd REPO_PATH && /usr/local/cpanel/3rdparty/bin/git pull origin main && /usr/bin/uapi VersionControlDeployment create repository_root=REPO_PATH
   ```

   **If your host uses CloudLinux:**
   ```bash
   cd REPO_PATH && /usr/local/cpanel/3rdparty/bin/git pull origin main && /usr/local/cpanel/bin/uapi VersionControlDeployment create repository_root=REPO_PATH
   ```

5. Click **Add New Cron Job**.

After this, every 5 (or 15) minutes cPanel will pull from GitHub and run the deploy defined in `.cpanel.yml`, so your changes will appear on the site shortly after you push. For a full "automate everything" guide, see **docs/AUTOMATE-EVERYTHING.md**.

---

## Summary

| Step | Where | What you do |
|------|--------|-------------|
| 1 | cPanel + GitHub | SSH key in cPanel → Deploy key in GitHub |
| 2 | Your repo | Set `DEPLOYPATH` in `.cpanel.yml` to `/home/your_cpanel_user/public_html/` and push |
| 3 | cPanel | Git Version Control → Create → Clone `git@github.com:emwangi2030-Edu/enkana_fresh_2.git` |
| 4 | cPanel | Manage → Pull or Deploy → Update from Remote → Deploy HEAD Commit |
| 5 | cPanel | Cron Jobs → run deployment every 5 (or 15) minutes |

After this, **pushing to GitHub** will be reflected on cPanel automatically within the cron interval (e.g. 5 minutes). No need to log in to cPanel for each deploy.

---

## Optional: Deploy only when you want (no cron)

If you prefer **manual** deploy:

- Skip Step 5.
- Whenever you want the site to update: **Git Version Control** → **Manage** → **Pull or Deploy** → **Update from Remote** → **Deploy HEAD Commit**.

---

## Changes pushed but not showing on the live site

If you’ve pushed to **main** (e.g. Reports, Revenue tracker, Mark as Paid, Customers pagination) and the live site still shows the old version after 5+ minutes:

1. **Deploy manually once** (so we’re not relying on cron):
   - cPanel → **Files** → **Git Version Control**.
   - Open your repo (e.g. `enkana_fresh_2`) → **Manage**.
   - Go to the **Pull or Deploy** tab.
   - Click **Update from Remote** (pulls latest `main` from GitHub).
   - Click **Deploy HEAD Commit** (runs `.cpanel.yml`: copies files and builds Farm-Fresh-Meats).
2. **Check the deploy result**: If deploy shows an error (e.g. `npm run build` failed), fix that (Node version in cPanel, env vars, or see build logs).
3. **Restart the Node app**: If you use **Setup Node.js App**, open it and click **Restart** so the app serves the new build.
4. **Hard refresh the browser**: Ctrl+Shift+R (or Cmd+Shift+R on Mac) or try an incognito window so you’re not seeing a cached old bundle.

If **Update from Remote** fails, the deploy key or repo URL may be wrong. If **Deploy HEAD Commit** fails, read the error (often `npm ci` / `npm run build`); ensure Node.js is set up in cPanel and the repo path is correct.

---

## Troubleshooting

- **Clone fails / Permission denied**  
  Use the SSH repo URL. Ensure the cPanel public key is added as a **Deploy key** in GitHub (Settings → Deploy keys) and that the key is **Authorized** in cPanel (SSH Access → Manage).

- **Deploy does nothing / wrong files**  
  Check `.cpanel.yml`: `DEPLOYPATH` must be your real cPanel home path (e.g. `/home/your_username/public_html/`). No wildcards; list files/dirs as in the example.

- **Cron runs but site doesn’t update**  
  Confirm the cron **Command** uses the exact **Repository path** shown in Git Version Control (Manage screen). Path is case-sensitive.

- **.cpanel.yml not found**  
  Ensure `.cpanel.yml` is in the **root** of the repo (same level as `index.html`) and that you’ve committed and pushed it.

- **Deploy ran but changes still not visible on the live site**
  1. **Confirm you're on the app URL** — The Node app (Orders, Customers, Reports, Revenue tracker) is served by the **Node.js application** in cPanel, not by the static files in `public_html`. If your app is on a subdomain (e.g. `app.enkanafresh.com` or `orders.enkanafresh.com`), open that URL. The main domain might only show the static marketing site.
  2. **Check that the build ran** — After **Deploy HEAD Commit**, look for any error message. If `npm ci` or `npm run build` failed, `Farm-Fresh-Meats/dist/` won't be updated. In cPanel File Manager, go to `repositories/enkana_fresh_2/Farm-Fresh-Meats/dist/public/` and check that files there have **today's date**. If the folder is missing or old, the build failed.
  3. **Restart the Node.js application** — cPanel → **Setup Node.js App** → your application → **Restart**. The running process may need a restart to serve from the new `dist/` or to clear any in-memory state.
  4. **Confirm in the browser** — When the app loads, a green bar at the top should show **"App version: 2026-02-25-c9df984"** for a few seconds. If you don't see that bar, you may be on the static site or an old build; try a hard refresh (Ctrl+Shift+R) or an incognito window.
