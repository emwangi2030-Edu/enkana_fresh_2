# Deploy webhook script

Use this for **instant** deploy on push (optional). If you only use the **cron** from [AUTOMATE-EVERYTHING.md](../docs/AUTOMATE-EVERYTHING.md), you can ignore this folder.

## Setup

1. Copy `deploy.php` to your server (e.g. via cPanel File Manager or above `public_html`).
2. Edit at the top:
   - `DEPLOY_SECRET` = a long random string (you’ll use the same in GitHub).
   - `REPO_PATH` = your repo path (e.g. `/home/enkanafresh/repos/enkana_fresh_2`).
   - If your host uses CloudLinux, switch the `UAPI_BIN` line as noted in the file.
3. In GitHub: **Settings → Webhooks → Add webhook**
   - Payload URL: `https://yourdomain.com/path/to/deploy.php`
   - Content type: `application/json`
   - Secret: same as `DEPLOY_SECRET`
   - Events: Just the push event.

**Security:** Prefer putting `deploy.php` outside `public_html`, or protect the folder (e.g. deny by default and allow only GitHub IPs or use a secret path). The script rejects requests without a valid GitHub signature.
