#!/bin/bash
# start.sh — Bootstrap and run yar MCP server
# Auto-installs dependencies on first run
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$DIR/node_modules" ]; then
  npm install --prefix "$DIR" --omit=dev >/dev/null 2>&1
fi

exec node "$DIR/dist/index.js"
