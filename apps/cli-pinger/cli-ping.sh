#!/usr/bin/env bash

# Pings each AI CLI in turn to keep their daily session quotas warm:
#   - agy (Gemini 3.5 Flash + Claude Sonnet 4.6 model swap)
#   - claude with CLAUDE_CONFIG_DIR=~/.claude-foundation
#   - claude with CLAUDE_CONFIG_DIR=~/.claude-zamp
#   - codex
#
# Runs from a systemd timer. Uses absolute Nix-profile paths so it is
# independent of the calling shell's PATH. Each ping is isolated: a failure
# in one ping does not abort the rest.

set -u

WORKSPACE_DIR="/home/chris/dev/quiver-hq/projects/tools"
LOG_FILE="/home/chris/.gemini/antigravity/cli-pinger.log"

AGY_PATH="/etc/profiles/per-user/chris/bin/agy"
CLAUDE_PATH="/etc/profiles/per-user/chris/bin/claude"
CODEX_PATH="/etc/profiles/per-user/chris/bin/codex"
NODE_PATH="/etc/profiles/per-user/chris/bin/node"

AGY_SETTINGS_FILE="/home/chris/.gemini/antigravity-cli/settings.json"
AGY_DEFAULT_MODEL="Gemini 3.5 Flash (Medium)"

mkdir -p "$(dirname "$LOG_FILE")"
cd "$WORKSPACE_DIR"

log() {
  echo "=== [$(date)] $1 ===" >> "$LOG_FILE"
}

# Always restore agy to its default model on exit, even on error.
restore_agy_settings() {
  if [ -f "$AGY_SETTINGS_FILE" ] && [ -x "$NODE_PATH" ]; then
    "$NODE_PATH" -e "
      const fs = require('fs');
      const s = JSON.parse(fs.readFileSync('$AGY_SETTINGS_FILE', 'utf8'));
      s.model = '$AGY_DEFAULT_MODEL';
      fs.writeFileSync('$AGY_SETTINGS_FILE', JSON.stringify(s, null, 2));
    " >> "$LOG_FILE" 2>&1 || true
  fi
}
trap restore_agy_settings EXIT

ping_agy_model() {
  local MODEL_NAME="$1"
  log "Pinging agy: $MODEL_NAME"
  if [ ! -x "$AGY_PATH" ] || [ ! -x "$NODE_PATH" ] || [ ! -f "$AGY_SETTINGS_FILE" ]; then
    echo "Skipping: agy/node/settings not available" >> "$LOG_FILE"
    return 0
  fi
  "$NODE_PATH" -e "
    const fs = require('fs');
    const s = JSON.parse(fs.readFileSync('$AGY_SETTINGS_FILE', 'utf8'));
    s.model = '$MODEL_NAME';
    fs.writeFileSync('$AGY_SETTINGS_FILE', JSON.stringify(s, null, 2));
  " >> "$LOG_FILE" 2>&1 || true
  "$AGY_PATH" --print "System ping" >> "$LOG_FILE" 2>&1 || true
  log "Finished agy: $MODEL_NAME"
}

ping_claude() {
  local CONFIG_DIR="$1"
  local LABEL="$2"
  log "Pinging claude: $LABEL ($CONFIG_DIR)"
  if [ ! -x "$CLAUDE_PATH" ]; then
    echo "Skipping: $CLAUDE_PATH not executable" >> "$LOG_FILE"
    return 0
  fi
  # Call the real binary directly (skip the PWD-aware ~/.local/bin/claude
  # shim) and set CLAUDE_CONFIG_DIR explicitly for this ping.
  CLAUDE_CONFIG_DIR="$CONFIG_DIR" "$CLAUDE_PATH" -p "System ping" \
    >> "$LOG_FILE" 2>&1 || true
  log "Finished claude: $LABEL"
}

ping_codex() {
  log "Pinging codex"
  if [ ! -x "$CODEX_PATH" ]; then
    echo "Skipping: $CODEX_PATH not executable" >> "$LOG_FILE"
    return 0
  fi
  "$CODEX_PATH" exec --sandbox read-only "System ping" \
    >> "$LOG_FILE" 2>&1 || true
  log "Finished codex"
}

ping_agy_model "Gemini 3.5 Flash (Medium)"
ping_agy_model "Claude Sonnet 4.6 (Thinking)"
ping_claude "$HOME/.claude-foundation" "foundation"
ping_claude "$HOME/.claude-zamp" "zamp"
ping_codex

echo "" >> "$LOG_FILE"
