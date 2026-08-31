#!/usr/bin/env bash
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AI_SERVICE="$ROOT/apps/ai-service"
AI_ENV_FILE="$AI_SERVICE/.env.local"
if [ -f "$AI_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$AI_ENV_FILE"
  set +a
fi
AI_URL="${NUVII_AI_SERVICE_URL:-http://127.0.0.1:${NUVII_AI_PORT:-8000}}"
STUDIO_PORT="${NUVII_STUDIO_PORT:-3000}"

echo "Nuvii Studio Doctor"
echo "==================="

echo -n "Node: "
if command -v node >/dev/null 2>&1; then node --version; else echo "MISSING"; fi

echo -n "Python: "
for p in python3.11 python3.10 python3; do
  if command -v "$p" >/dev/null 2>&1; then "$p" --version; break; fi
done

echo -n "Final LoRA: "
MODEL_FILE="${NUVII_LORA_PATH:-$AI_SERVICE/model/pytorch_lora_weights.safetensors}"
case "$MODEL_FILE" in
  /*) ;;
  *) MODEL_FILE="$AI_SERVICE/$MODEL_FILE" ;;
esac
EXPECTED_SHA="5289277226d5e2d1b77b2292276079748d3a1277ddb23170bcc53a911d89b77a"
if [ -f "$MODEL_FILE" ]; then
  if [ "$MODEL_FILE" = "$AI_SERVICE/model/pytorch_lora_weights.safetensors" ] \
    && command -v shasum >/dev/null 2>&1; then
    ACTUAL_SHA=$(shasum -a 256 "$MODEL_FILE" | awk '{print $1}')
    if [ "$ACTUAL_SHA" = "$EXPECTED_SHA" ]; then echo "present + verified"; else echo "present, CHECKSUM MISMATCH"; fi
  elif [ -r "$MODEL_FILE" ]; then
    echo "present + readable ($MODEL_FILE)"
  else
    echo "present but not readable ($MODEL_FILE)"
  fi
else
  echo "MISSING ($MODEL_FILE)"
fi

echo -n "Checkpoint ensemble: "
COUNT=$(find "$ROOT/apps/ai-service/model/checkpoints" -name '*.safetensors' 2>/dev/null | wc -l | tr -d ' ')
echo "$COUNT checkpoint(s)"

echo -n "OpenAI controller: "
if [ -f "$ROOT/apps/studio/.env.local" ] && grep -q '^OPENAI_API_KEY=..' "$ROOT/apps/studio/.env.local"; then
  echo "configured"
else
  echo "not configured (local fallback will work)"
fi

echo -n "AI health: "
if curl -fsS "$AI_URL/health" 2>/dev/null; then echo; else echo "not running at $AI_URL"; fi

echo -n "Studio port $STUDIO_PORT: "
if curl -fsS "http://localhost:$STUDIO_PORT" >/dev/null 2>&1; then echo "running"; else echo "not running"; fi

echo
echo "AI log: $ROOT/logs/ai-service.log"
