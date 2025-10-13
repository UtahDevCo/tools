#!/usr/bin/env bash
set -e

# Parse command line arguments
ENV_NAME="development"
if [[ "$1" == "--production" ]]; then
  ENV_NAME="production"
fi

echo "=== Configuring Wrangler environment: $ENV_NAME ==="

# Determine the path to the root .env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
# Choose .env file based on environment
if [[ "$ENV_NAME" == "production" ]]; then
  ENV_FILE="$ROOT_DIR/.env.production"
else
  ENV_FILE="$ROOT_DIR/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  exit 1
fi

echo "Loading environment variables from $ENV_FILE"

# Source the .env file (export all variables)
set -a
source "$ENV_FILE"
set +a

# Generate JWT keys and save to temp file
echo "Generating JWT keys..."
cd "$SCRIPT_DIR/.."
bun run scripts/generate-keys.ts > keys-output.txt

# Extract private and public keys
JWT_PRIVATE_KEY=$(grep -A 100 "BEGIN PRIVATE KEY" keys-output.txt | grep -B 100 "END PRIVATE KEY")
JWT_PUBLIC_KEY=$(grep -A 100 "BEGIN PUBLIC KEY" keys-output.txt | grep -B 100 "END PUBLIC KEY")

# Clean up temp file
rm keys-output.txt

# Append JWT keys to .env if not already present
if ! grep -q "JWT_PRIVATE_KEY=" "$ENV_FILE"; then
  echo "" >> "$ENV_FILE"
  echo "JWT_PRIVATE_KEY=\"$JWT_PRIVATE_KEY\"" >> "$ENV_FILE"
  echo "Added JWT_PRIVATE_KEY to $ENV_FILE"
else
  echo "JWT_PRIVATE_KEY already exists in $ENV_FILE (not overwriting)"
fi

if ! grep -q "JWT_PUBLIC_KEY=" "$ENV_FILE"; then
  echo "JWT_PUBLIC_KEY=\"$JWT_PUBLIC_KEY\"" >> "$ENV_FILE"
  echo "Added JWT_PUBLIC_KEY to $ENV_FILE"
else
  echo "JWT_PUBLIC_KEY already exists in $ENV_FILE (not overwriting)"
fi

# Function to set a wrangler secret
set_secret() {
  local NAME=$1
  local VALUE=$2
  
  if [ -z "$VALUE" ]; then
    echo "Warning: $NAME is empty; skipping"
    return
  fi
  
  echo "Setting $NAME..."
  bunx wrangler secret put "$NAME" --env="$ENV_NAME" <<EOF
$VALUE
EOF
}

# Function to set a wrangler environment variable (non-secret)
set_env_var() {
  local NAME=$1
  local VALUE=$2
  
  if [ -z "$VALUE" ]; then
    echo "Warning: $NAME is empty; skipping"
    return
  fi
  
  echo "Setting $NAME (as environment variable)..."
  # Note: wrangler doesn't have a direct "env put" command for non-secret vars
  # They should be set in wrangler.toml [env.*.vars] section
  # For now, we'll store them as secrets if they need to be dynamic
  bunx wrangler secret put "$NAME" --env="$ENV_NAME" <<EOF
$VALUE
EOF
}

# Push all required environment variables to Wrangler
echo ""
echo "=== Pushing secrets to Wrangler ($ENV_NAME) ==="

set_secret "JWT_PRIVATE_KEY" "$JWT_PRIVATE_KEY"
set_secret "JWT_PUBLIC_KEY" "$JWT_PUBLIC_KEY"
set_secret "RESEND_API_KEY" "$RESEND_API_KEY"
set_env_var "ALLOWED_ORIGINS" "$ALLOWED_ORIGINS"
set_env_var "APP_URLS" "$APP_URLS"
set_env_var "AUTH_URL" "$AUTH_URL"
set_env_var "DEFAULT_APP_URL" "$DEFAULT_APP_URL"

echo ""
echo "=== Configuration complete for $ENV_NAME environment ==="