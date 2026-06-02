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

# Back up original settings so we always restore, even on error
SETTINGS_BACKUP="$(cat "$SETTINGS_FILE")"
restore_settings() {
  echo "$SETTINGS_BACKUP" > "$SETTINGS_FILE"
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

ping_model "Gemini 3.5 Flash (Medium)"
ping_model "Claude Sonnet 4.6 (Thinking)"
