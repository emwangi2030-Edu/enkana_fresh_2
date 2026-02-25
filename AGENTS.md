# Agent automation

Everything runs from Cursor: tasks, terminal, and agent. See **.vscode/CURSOR-FOR-EVERYTHING.md** for the full guide.

## One-time (all projects)

Run **once** in your terminal (any directory):

```bash
/Users/mac/.cursor/scripts/setup-node.sh
```

Installs Homebrew (if needed) and Node. After that, npm works in every project and when the agent runs commands. See **~/.cursor/README-SETUP.md** for details.

## How the agent runs things

- **npm / Node:** Via global script **`/Users/mac/.cursor/scripts/with-node.sh`** (see `.cursor/rules/terminal-and-automation.mdc`).
  - Example: `ROOT=Farm-Fresh-Meats /Users/mac/.cursor/scripts/with-node.sh npm run dev`
- **Python preview:** `python3 serve.py` (port 8888).
- **Full app (Farm-Fresh-Meats):** Run Task **"Run Farm-Fresh-Meats (full app)"** or the command above → http://localhost:5000

## Tasks (Cmd+Shift+P → Run Task)

- **Preview site (Python server)** – static site at http://localhost:8888
- **Run Farm-Fresh-Meats (full app)** – uses `npm run dev` in Farm-Fresh-Meats (ensure Node is installed)

## Cursor rule

`.cursor/rules/terminal-and-automation.mdc` tells the agent to use `scripts/with-node.sh` for all npm/node commands so automation works from here.
