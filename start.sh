#!/bin/bash
# start.sh — Bootstrap and run yar MCP server
# Auto-installs dependencies and builds on first run
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$DIR/node_modules" ]; then
  npm install --prefix "$DIR" --omit=dev >/dev/null 2>&1
fi

if [ ! -f "$DIR/dist/index.js" ]; then
  echo "[yar] First run — installing dependencies..." >&2
  npm install --prefix "$DIR" 2>&1 | tail -1 >&2
  echo "[yar] Building TypeScript..." >&2
  if ! npx --prefix "$DIR" tsc 2>&1 | head -20 >&2; then
    echo "[yar] ERROR: TypeScript build failed. Run 'npx tsc' in $DIR to see full errors." >&2
    exit 1
  fi
  echo "[yar] Build complete." >&2
fi

exec node "$DIR/dist/index.js"
