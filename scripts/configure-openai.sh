#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/studio/.env.local"

printf 'Nuvii Smart AI — OpenAI setup\n'
printf '=============================\n'
printf 'Your API key is stored only in apps/studio/.env.local and is ignored by Git.\n\n'
read -r -s -p 'Paste your OpenAI API key: ' OPENAI_KEY
printf '\n'
if [ -z "$OPENAI_KEY" ]; then
  echo 'No key entered. Nothing changed.'
  exit 1
fi

cat > "$ENV_FILE" <<EOF
NUVII_AI_SERVICE_URL=http://127.0.0.1:8000
OPENAI_API_KEY=$OPENAI_KEY
NUVII_OPENAI_MODEL=gpt-5.4-mini
EOF
chmod 600 "$ENV_FILE"
echo "✓ OpenAI controller configured in $ENV_FILE"
echo 'Restart ./scripts/start-all.sh so Next.js loads the new environment.'
