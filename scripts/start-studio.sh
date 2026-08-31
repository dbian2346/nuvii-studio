#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/studio"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required. Install it from https://nodejs.org/ and rerun this script."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing Nuvii Studio web dependencies..."
  npm install
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi

export NUVII_AI_SERVICE_URL="${NUVII_AI_SERVICE_URL:-http://127.0.0.1:8000}"
STUDIO_HOST="${NUVII_STUDIO_HOST:-127.0.0.1}"
STUDIO_PORT="${NUVII_STUDIO_PORT:-3000}"

echo "Starting Nuvii Studio at http://localhost:$STUDIO_PORT"
echo "AI proxy target: $NUVII_AI_SERVICE_URL"
npm run dev -- --hostname "$STUDIO_HOST" --port "$STUDIO_PORT"
