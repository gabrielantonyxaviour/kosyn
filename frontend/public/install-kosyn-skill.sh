#!/bin/sh
set -e

SKILL_DIR="$HOME/.claude/skills/kosyn-x402"
SKILL_URL="https://kosyn.app/kosyn-x402-skill.md"

echo "Installing Kosyn x402 skill..."
mkdir -p "$SKILL_DIR"
curl -fsSL "$SKILL_URL" -o "$SKILL_DIR/SKILL.md"
echo "✓ Installed to $SKILL_DIR/SKILL.md"
echo ""
echo "Open a new Claude Code session — the skill will load automatically."
