#!/bin/bash
# Run Farm-Fresh-Meats locally (requires Node 20+ and npm)
cd "$(dirname "$0")"
if ! command -v npm &>/dev/null; then
  echo "npm not found. Install Node.js from https://nodejs.org or enable nvm."
  exit 1
fi
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi
echo "Starting app on http://localhost:5000 ..."
npm run dev
