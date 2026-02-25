# Automate everything: push & pull

Once this is set up, you only **push from your Mac**; the live site updates automatically. No need to open cPanel to pull or deploy.

---

## How it works

| You do | What happens automatically |
|--------|-----------------------------|
| `git push origin main` on your Mac | Code is on GitHub. |
| (Nothing else) | Every 5 minutes, cPanel **pulls** from GitHub and **deploys** to `public_html`. |

So: **push = automatic**. No manual pull or deploy in cPanel.

---

## One-time setup (you only do this once)

### 1. Repo and deploy key (already done)

- GitHub repo: `emwangi2030-Edu/enkana_fresh_2`
- cPanel clone: **Git Version Control** → repo cloned with SSH
- cPanel deploy key added in GitHub **Deploy keys**
- `.cpanel.yml` in repo with `DEPLOYPATH=/home/enkanafresh/public_html/`

### 2. Get your repo path in cPanel

1. cPanel → **Files** → **Git Version Control**.
2. Click **Manage** next to **enkana_fresh_2**.
3. Copy the **Repository Path** (e.g. `/home/enkanafresh/repos/enkana_fresh_2`).  
   You’ll use this exact path in the cron below.

### 3. Add one cron job (pull + deploy)

The cron must do **two things**: pull from GitHub, then run the deploy. Use your real **Repository Path** from step 2.

1. cPanel → **Advanced** → **Cron Jobs**.
2. **Add New Cron Job.**
3. **Schedule:** **Every 5 minutes** (or 15 if you prefer).
4. **Command:** paste **one** of the blocks below.  
   Replace `REPO_PATH` with your actual path, e.g. `/home/enkanafresh/repos/enkana_fresh_2`.

**Standard cPanel (one line):**

```bash
cd REPO_PATH && /usr/local/cpanel/3rdparty/bin/git pull origin main && /usr/bin/uapi VersionControlDeployment create repository_root=REPO_PATH
```

**Example with your username (if repo path is `repos/enkana_fresh_2`):**

```bash
cd /home/enkanafresh/repos/enkana_fresh_2 && /usr/local/cpanel/3rdparty/bin/git pull origin main && /usr/bin/uapi VersionControlDeployment create repository_root=/home/enkanafresh/repos/enkana_fresh_2
```

**If your host uses CloudLinux**, use this instead (same idea, different `uapi` path):

```bash
cd /home/enkanafresh/repos/enkana_fresh_2 && /usr/local/cpanel/3rdparty/bin/git pull origin main && /usr/local/cpanel/bin/uapi VersionControlDeployment create repository_root=/home/enkanafresh/repos/enkana_fresh_2
```

5. Click **Add New Cron Job**.

---

## Your daily workflow

1. Edit code on your Mac.
2. Commit and push:
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```
3. Do nothing in cPanel. Within about 5 minutes (or your cron interval), the live site will update.

---

## Optional: instant deploy with a GitHub webhook

If you want the site to update **as soon as you push** (instead of waiting for the cron), you can add a webhook that runs the same pull + deploy.

### A. Create a secret

Pick a long random string (e.g. from [randomkeygen.com](https://randomkeygen.com/)). You’ll use it in GitHub and in the script. Example: `MySecretDeployKey2024XYZ`.

### B. Add the deploy script on the server

1. In cPanel **File Manager**, go to a folder that is **not** public (e.g. above `public_html`) or a folder inside `public_html` that you’ll protect with `.htaccess`.
2. Create a file, e.g. `deploy.php`, with the content from **`deploy/deploy.php`** in this repo (see below).
3. In that file, set:
   - `DEPLOY_SECRET` = the secret you chose.
   - `REPO_PATH` = your Git repo path (e.g. `/home/enkanafresh/repos/enkana_fresh_2`).
4. If the file is under `public_html`, add a `.htaccess` in the same folder with:
   ```apache
   # Restrict to your IP if possible, or keep secret strong
   # Optional: deny from all and allow from your IP
   ```

### C. Add the webhook in GitHub

1. Repo → **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL:** `https://enkanafresh.com/path/to/deploy.php` (use the real URL where you put `deploy.php`).
3. **Content type:** `application/json`.
4. **Secret:** the same secret you put in `DEPLOY_SECRET`.
5. **Events:** Just the push event.
6. Save.

After that, each push will trigger the script, which will pull and deploy immediately (no need to wait for the cron).

---

## Troubleshooting

- **Cron runs but site doesn’t update**  
  Check the **Repository Path** in the cron: it must match exactly what cPanel shows in Git Version Control (Manage). Path is case-sensitive.

- **“Permission denied” or git pull fails in cron**  
  The deploy key must be **Authorized** in cPanel (Security → SSH Access → Manage). Cron runs as your user, so it uses that key for `git pull`.

- **Deploy runs but files don’t change**  
  Confirm `.cpanel.yml` is in the repo root and has `DEPLOYPATH=/home/enkanafresh/public_html/`. Run **Update from Remote** and **Deploy HEAD Commit** once manually to test.

- **Webhook returns 500 or doesn’t run**  
  Some hosts disable `shell_exec` or `exec`. In that case, rely on the cron; it’s enough for automatic pull + deploy.
