#!/usr/bin/env bash
# One-time setup: ensure Node.js is on PATH for this project and agent terminals.
# Run from repo root: ./scripts/setup-node.sh
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

install_node() {
  if command -v brew &>/dev/null; then
    echo "Installing Node.js via Homebrew..."
    brew install node
    return
  fi
  if [ -d "$HOME/.nvm" ]; then
    echo "Installing Node via nvm..."
    . "$HOME/.nvm/nvm.sh" 2>/dev/null || true
    nvm install --lts 2>/dev/null || nvm install node
    nvm use --lts 2>/dev/null || nvm use node
    return
  fi
  echo "Install Node.js from https://nodejs.org (LTS) or run: brew install node"
  exit 1
}

if command -v node &>/dev/null && command -v npm &>/dev/null; then
  echo "Node $(node -v) and npm $(npm -v) already available."
  exit 0
fi

install_node
echo "Done. Node: $(node -v), npm: $(npm -v)"
