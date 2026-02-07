#!/bin/bash
# install.sh — Set up yar-mcp-server with /chat skill and auto-reply hook
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "=== yar-mcp-server installer ==="
echo ""

# 1. Build
echo "[1/4] Building..."
npm install
npm run build
echo "  ✓ Built"

# 2. Install /chat skill
SKILL_DIR="$CLAUDE_DIR/skills/yar-chat"
mkdir -p "$SKILL_DIR"
cp "$SCRIPT_DIR/skills/yar-chat/SKILL.md" "$SKILL_DIR/SKILL.md"
echo "  ✓ /chat skill installed → $SKILL_DIR"

# 3. Install PostToolUse hook
HOOK_DIR="$CLAUDE_DIR/hooks"
mkdir -p "$HOOK_DIR"
cp "$SCRIPT_DIR/hooks/yar-await-nudge.sh" "$HOOK_DIR/yar-await-nudge.sh"
chmod +x "$HOOK_DIR/yar-await-nudge.sh"
echo "  ✓ PostToolUse hook installed → $HOOK_DIR"

# 4. Print MCP config + hook config for user to add
echo ""
echo "[2/4] Done! Add this to your Claude Code settings:"
echo ""
echo "── MCP Server (~/.claude/settings.json → mcpServers) ──"
echo ""
cat <<EOF
{
  "mcpServers": {
    "yar": {
      "command": "node",
      "args": ["$SCRIPT_DIR/dist/index.js"]
    }
  }
}
EOF
echo ""
echo "── PostToolUse Hook (~/.claude/settings.json → hooks) ──"
echo ""
cat <<EOF
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "yar__say",
        "hooks": [
          {
            "type": "command",
            "command": "$HOOK_DIR/yar-await-nudge.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
EOF
echo ""
echo "── Tool Permissions (add to permissions.allow) ──"
echo ""
cat <<EOF
"mcp__yar__join",
"mcp__yar__say",
"mcp__yar__listen",
"mcp__yar__leave"
EOF
echo ""
echo "[3/4] After adding the config, restart Claude Code."
echo "[4/4] Then type /chat in any session to start chatting!"
echo ""
echo "=== Installation complete ==="
