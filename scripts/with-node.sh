#!/usr/bin/env bash
# Finds Node/npm (nvm, fnm, Homebrew, system) and runs the given command.
# Usage: ROOT=Farm-Fresh-Meats ./scripts/with-node.sh npm run dev
# Or: ./scripts/with-node.sh npm run dev   (runs from repo root)
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="${ROOT:-$REPO_ROOT}"
# If ROOT is relative, make it relative to repo root
[[ "$ROOT" != /* ]] && ROOT="$REPO_ROOT/$ROOT"

export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin"

# NVM: source if present (makes node/npm available in this shell)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

# NVM: or add latest node version to PATH if not sourced
if ! command -v npm &>/dev/null && [ -d "$HOME/.nvm/versions/node" ]; then
  NODE_DIR=$(ls -1v "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)
  [ -n "$NODE_DIR" ] && export PATH="$HOME/.nvm/versions/node/$NODE_DIR/bin:$PATH"
fi

# fnm
if ! command -v npm &>/dev/null && [ -d "$HOME/.local/share/fnm" ]; then
  export PATH="$HOME/.local/share/fnm/current/bin:$PATH"
fi

if ! command -v npm &>/dev/null; then
  echo "Node/npm not found. Install from https://nodejs.org or: brew install node"
  exit 1
fi

cd "$ROOT"
exec "$@"
