#!/usr/bin/env bash

# Exit on error
set -e

# Define paths
WORKSPACE_DIR="/home/chris/dev/quiver-hq/projects/tools"
LOG_FILE="/home/chris/.gemini/antigravity/agy-pinger.log"
AGY_PATH="/etc/profiles/per-user/chris/bin/agy"
NODE_PATH="/etc/profiles/per-user/chris/bin/node"
SETTINGS_FILE="/home/chris/.gemini/antigravity-cli/settings.json"

# Ensure the log file directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Navigate to the workspace
cd "$WORKSPACE_DIR"

# Always restore to Gemini 3.5 Flash on exit, even on error
restore_settings() {
  "$NODE_PATH" -e "
    const fs = require('fs');
    const s = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
    s.model = 'Gemini 3.5 Flash (Medium)';
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(s, null, 2));
  "
}
trap restore_settings EXIT

ping_model() {
  local MODEL_NAME="$1"

  echo "=== [$(date)] Pinging: $MODEL_NAME ===" >> "$LOG_FILE"

  # Swap model in settings.json using node
  "$NODE_PATH" -e "
    const fs = require('fs');
    const s = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
    s.model = '$MODEL_NAME';
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(s, null, 2));
  "

  # Run agy in non-interactive print mode
  if [ -x "$AGY_PATH" ]; then
    "$AGY_PATH" --print "System ping" >> "$LOG_FILE" 2>&1
  else
    echo "Warning: $AGY_PATH not executable. Falling back to PATH." >> "$LOG_FILE"
    agy --print "System ping" >> "$LOG_FILE" 2>&1
  fi

  echo "=== [$(date)] Finished: $MODEL_NAME ===" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
}

ping_codex() {
  local CODEX_PATH="/home/chris/.npm-global/bin/codex"
  echo "=== [$(date)] Pinging: Codex CLI ===" >> "$LOG_FILE"

  if [ -x "$CODEX_PATH" ]; then
    "$CODEX_PATH" exec --dangerously-bypass-approvals-and-sandbox --ephemeral "System ping" >> "$LOG_FILE" 2>&1
  else
    echo "Warning: $CODEX_PATH not executable. Falling back to PATH." >> "$LOG_FILE"
    codex exec --dangerously-bypass-approvals-and-sandbox --ephemeral "System ping" >> "$LOG_FILE" 2>&1
  fi

  echo "=== [$(date)] Finished: Codex CLI ===" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
}

ping_claude_cli() {
  local CLAUDE_PATH="/etc/profiles/per-user/chris/bin/claude"
  echo "=== [$(date)] Pinging: Claude CLI ===" >> "$LOG_FILE"

  if [ -x "$CLAUDE_PATH" ]; then
    "$CLAUDE_PATH" --print "System ping" --dangerously-skip-permissions --no-session-persistence >> "$LOG_FILE" 2>&1
  else
    echo "Warning: $CLAUDE_PATH not executable. Falling back to PATH." >> "$LOG_FILE"
    claude --print "System ping" --dangerously-skip-permissions --no-session-persistence >> "$LOG_FILE" 2>&1
  fi

  echo "=== [$(date)] Finished: Claude CLI ===" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
}

ping_model "Gemini 3.5 Flash (Medium)"
ping_model "Claude Sonnet 4.6 (Thinking)"
ping_codex
ping_claude_cli
