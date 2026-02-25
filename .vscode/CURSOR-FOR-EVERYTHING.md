# Use Cursor for everything

This workspace is set up so you can do all development from Cursor: run the app, use the terminal, and let the agent run commands.

---

## 1. Run tasks (no external terminal)

**Cmd + Shift + P** → **Run Task** → pick one:

| Task | What it does |
|------|-------------------------------|
| **Preview site (Python server)** | Serves the static site at **http://localhost:8888** (index, login, dashboard). |
| **Run Farm-Fresh-Meats (full app)** | Starts the full app (client + server + Supabase) at **http://localhost:5000**. |

Node is provided by the global script (`~/.cursor/scripts/with-node.sh`), so the task finds npm even when the task runner doesn’t load your shell profile.

---

## 2. Terminal in Cursor

- **Ctrl + `** or **View → Terminal** to open the integrated terminal.
- The default profile is **zsh (login)** so your `.zshrc` (and nvm) loads and **Node/npm are available**.
- You can run `npm install`, `npm run dev`, `git`, etc. from here.

---

## 3. Preview in the editor

- **Live Preview:** Right‑click `index.html` → **Show Preview** (or **Open with Live Preview**) for the static site with refresh on save.
- **Simple Browser:** **Cmd + Shift + P** → **Simple Browser: Show** → enter `http://localhost:8888` or `http://localhost:5000` after starting a task.

---

## 4. Agent

The agent uses the same global Node script and tasks, so “run the app”, “install deps”, etc. run from here without you leaving Cursor.

---

**Summary:** Open this folder in Cursor, use **Run Task** for the app you want, use **Terminal** for any command (Node is available), and use the agent for automation—all set here.
