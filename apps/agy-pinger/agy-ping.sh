#!/usr/bin/env bash

# Exit on error
set -e

# Define paths
WORKSPACE_DIR="/home/chris/dev/quiver-hq/projects/tools"
LOG_FILE="/home/chris/.gemini/antigravity/agy-pinger.log"
AGY_PATH="/etc/profiles/per-user/chris/bin/agy"

# Ensure the log file directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Navigate to the workspace
cd "$WORKSPACE_DIR"

echo "=== [$(date)] Antigravity Pinger Started ===" >> "$LOG_FILE"

# Run agy in non-interactive print mode to start/keep-alive a session.
# We provide a lightweight prompt to start the session.
if [ -x "$AGY_PATH" ]; then
  "$AGY_PATH" --print "System ping" >> "$LOG_FILE" 2>&1
else
  echo "Warning: Absolute path $AGY_PATH not executable. Falling back to PATH." >> "$LOG_FILE"
  agy --print "System ping" >> "$LOG_FILE" 2>&1
fi

echo "=== [$(date)] Antigravity Pinger Finished ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
