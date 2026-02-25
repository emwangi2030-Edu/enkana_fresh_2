# Connect to GitHub via SSH (one-time setup)

Follow these steps once; after that, `git push` and `git pull` won’t ask for your username or password.

---

## Step 1: Generate an SSH key

Open Terminal and run (replace with your GitHub email):

```bash
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519 -N ""
```

- **`-N ""`** = no passphrase (easiest; key is still secure).
- To use a passphrase for extra security, run without `-N ""` and you’ll be prompted to enter one.

You should see something like:
`Your identification has been saved in /Users/you/.ssh/id_ed25519`

---

## Step 2: Start the SSH agent and add your key

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

To add the key automatically on every login (macOS), create or edit `~/.ssh/config`:

```bash
touch ~/.ssh/config
chmod 600 ~/.ssh/config
```

Add these lines (using `nano ~/.ssh/config` or any editor):

```
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
```

Then add the key to the agent with keychain so it persists:

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

---

## Step 3: Copy your public key

Display the public key (you’ll add this to GitHub in the next step):

```bash
cat ~/.ssh/id_ed25519.pub
```

**Copy the entire line** (starts with `ssh-ed25519` and ends with your email).

---

## Step 4: Add the key to GitHub

1. Open **GitHub** → click your **profile picture** (top right) → **Settings**.
2. In the left sidebar, click **SSH and GPG keys**.
3. Click **New SSH key**.
4. **Title:** e.g. `Mac - enkana` (any name you like).
5. **Key type:** Authentication Key.
6. **Key:** Paste the line you copied from Step 3.
7. Click **Add SSH key**.

---

## Step 5: Test the connection

```bash
ssh -T git@github.com
```

First time you may see:
`Are you sure you want to continue connecting (yes/no)?` → type **yes**.

Success looks like:
`Hi emwangi2030-Edu! You've successfully authenticated...`

---

## Step 6: Use SSH for this repo

From your project folder:

```bash
cd /Users/mac/Dev\ Projects/enkana-fresh-cpanel
git remote set-url origin git@github.com:emwangi2030-Edu/enkana_fresh_2.git
git remote -v
```

You should see `origin` pointing to `git@github.com:...` (SSH), not `https://...`.

---

## Step 7: Push (no password prompt)

```bash
git push -u origin main
```

You won’t be asked for username or password again for this repo when using SSH.

---

## Quick reference

| Action        | Command |
|---------------|--------|
| Check remote  | `git remote -v` |
| Switch to SSH | `git remote set-url origin git@github.com:emwangi2030-Edu/enkana_fresh_2.git` |
| Switch to HTTPS | `git remote set-url origin https://github.com/emwangi2030-Edu/enkana_fresh_2.git` |

---

## Troubleshooting

- **“Permission denied (publickey)”**  
  - Confirm the public key in Step 3 was added to GitHub (Step 4).  
  - Run `ssh-add -l` and ensure your key is listed; if not, run `ssh-add ~/.ssh/id_ed25519` again.

- **New Mac or new terminal**  
  - Run Step 2 again (ssh-agent + `ssh-add`), or use the `~/.ssh/config` + `ssh-add --apple-use-keychain` setup so the key loads automatically.

- **Multiple GitHub accounts**  
  - Use different key files and set `Host` aliases in `~/.ssh/config`; use the alias in the repo URL (e.g. `git@github-work:user/repo.git`).
