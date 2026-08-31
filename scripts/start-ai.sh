#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE="$ROOT/apps/ai-service"
cd "$SERVICE"

AI_ENV_FILE="$SERVICE/.env.local"
if [ -f "$AI_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$AI_ENV_FILE"
  set +a
fi

choose_python() {
  if [ -n "${NUVII_PYTHON:-}" ] && command -v "$NUVII_PYTHON" >/dev/null 2>&1; then
    printf '%s\n' "$NUVII_PYTHON"
    return
  fi
  for candidate in python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
      "$candidate" - <<'PY' >/dev/null 2>&1 && { printf '%s\n' "$candidate"; return; }
import sys
raise SystemExit(0 if sys.version_info >= (3, 9) else 1)
PY
    fi
  done
  return 1
}

PYTHON_BIN="$(choose_python || true)"
if [ -z "$PYTHON_BIN" ]; then
  echo "Nuvii AI needs Python 3.9 or newer. Install Python 3.11 from python.org and rerun this script."
  exit 1
fi

echo "Using $($PYTHON_BIN --version 2>&1) at $(command -v "$PYTHON_BIN")"

if [ -n "${NUVII_LORA_PATH:-}" ]; then
  LORA_PATH_WAS_EXPLICIT=1
else
  LORA_PATH_WAS_EXPLICIT=0
fi
LORA_PATH="${NUVII_LORA_PATH:-$SERVICE/model/pytorch_lora_weights.safetensors}"
case "$LORA_PATH" in
  /*) ;;
  *) LORA_PATH="$SERVICE/$LORA_PATH" ;;
esac

if [ ! -e "$LORA_PATH" ]; then
  echo "LoRA weights not found at $LORA_PATH"
  echo "Set NUVII_LORA_PATH in $AI_ENV_FILE or export it before starting Nuvii."
  exit 1
fi
if [ ! -f "$LORA_PATH" ]; then
  echo "Configured LoRA path is not a file: $LORA_PATH"
  exit 1
fi
if [ ! -r "$LORA_PATH" ]; then
  echo "LoRA weights are not readable at $LORA_PATH"
  exit 1
fi
export NUVII_LORA_PATH="$LORA_PATH"
export NUVII_LORA_EXPLICIT="$LORA_PATH_WAS_EXPLICIT"
echo "Nuvii LoRA: $NUVII_LORA_PATH"

# Recreate stale/broken environments automatically.
if [ -d .venv ]; then
  if ! .venv/bin/python - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info >= (3, 9) else 1)
PY
  then
    echo "Recreating an incompatible virtual environment..."
    rm -rf .venv
  fi
fi

if [ ! -d .venv ]; then
  echo "Creating Nuvii AI virtual environment..."
  "$PYTHON_BIN" -m venv .venv
fi

source .venv/bin/activate

echo "AI virtual environment: $(python --version 2>&1)"

REQ_HASH=$(python - <<'PYREQ'
import hashlib
from pathlib import Path
print(hashlib.sha256(Path("requirements.txt").read_bytes()).hexdigest()[:16])
PYREQ
)
REQ_MARKER=".venv/.nuvii_requirements_${REQ_HASH}"

if [ ! -f "$REQ_MARKER" ]; then
  echo "Installing/updating Nuvii AI dependencies..."
  python -m pip install --upgrade pip
  python -m pip install -r requirements.txt
  rm -f .venv/.nuvii_requirements_* .venv/.nuvii_dependencies_ready 2>/dev/null || true
  touch "$REQ_MARKER"
fi

AI_HOST="${NUVII_AI_HOST:-127.0.0.1}"
AI_PORT="${NUVII_AI_PORT:-8000}"
if ! [[ "$AI_PORT" =~ ^[0-9]+$ ]]; then
  echo "NUVII_AI_PORT must be a number; received: $AI_PORT"
  exit 1
fi

echo "Starting FastAPI at http://$AI_HOST:$AI_PORT"
exec python -m uvicorn main:app --host "$AI_HOST" --port "$AI_PORT"
