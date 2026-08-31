#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs"
AI_LOG="$LOG_DIR/ai-service.log"
AI_HOST="${NUVII_AI_HOST:-127.0.0.1}"
AI_PORT="${NUVII_AI_PORT:-8000}"
AI_URL="${NUVII_AI_SERVICE_URL:-http://$AI_HOST:$AI_PORT}"
STUDIO_PORT="${NUVII_STUDIO_PORT:-3000}"
STUDIO_URL="http://localhost:$STUDIO_PORT"
export NUVII_AI_HOST="$AI_HOST"
export NUVII_AI_PORT="$AI_PORT"
export NUVII_AI_SERVICE_URL="$AI_URL"
mkdir -p "$LOG_DIR"
: > "$AI_LOG"

if ! command -v curl >/dev/null 2>&1; then
  echo "Nuvii startup needs curl to verify the local AI health endpoint."
  exit 1
fi

cleanup() {
  if [ -n "${AI_PID:-}" ] && kill -0 "$AI_PID" 2>/dev/null; then
    kill "$AI_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

"$ROOT/scripts/start-ai.sh" >"$AI_LOG" 2>&1 &
AI_PID=$!

echo "Starting Nuvii AI at $AI_URL"
echo "AI log: $AI_LOG"
echo "Waiting for the AI service to become ready..."

READY=0
HEALTH_RESPONSE=""
for _ in $(seq 1 600); do
  if HEALTH_RESPONSE="$(curl -fsS "$AI_URL/health" 2>/dev/null)"; then
    if printf '%s' "$HEALTH_RESPONSE" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' \
      && printf '%s' "$HEALTH_RESPONSE" | grep -Eq '"loraConfigured"[[:space:]]*:[[:space:]]*true'; then
      READY=1
      break
    fi
  fi
  if ! kill -0 "$AI_PID" 2>/dev/null; then
    echo
    echo "The AI service stopped during startup. Last log lines:"
    tail -80 "$AI_LOG" || true
    exit 1
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo
  echo "The AI service did not become ready within 10 minutes. Last log lines:"
  tail -80 "$AI_LOG" || true
  exit 1
fi

echo "✓ Nuvii AI service is ready: $HEALTH_RESPONSE"

ENV_FILE="$ROOT/apps/studio/.env.local"
if [ -f "$ENV_FILE" ] && grep -q '^OPENAI_API_KEY=..' "$ENV_FILE"; then
  echo "✓ OpenAI Smart Controller is configured."
else
  echo "ℹ OpenAI Smart Controller is not configured yet."
  echo "  Nuvii will still work with its deterministic fallback parser."
  echo "  For structured prompt interpretation + visual QC, run: ./scripts/configure-openai.sh"
fi

echo "✓ Starting the editor at $STUDIO_URL"
echo "✓ Next.js will proxy AI requests to $NUVII_AI_SERVICE_URL"
echo "The first Generate request downloads SSD-1B plus the MPS-safe VAE and can take several minutes. Keep this Terminal open."

"$ROOT/scripts/start-studio.sh"
