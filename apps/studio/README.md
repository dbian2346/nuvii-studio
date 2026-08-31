# Nuvii Studio web app

Next.js editor and Smart AI orchestration layer.

The OpenAI API key, when configured, is only read by server-side route handlers. Browser code never receives the key.

Smart AI routes live under `src/app/api/ai/`. Server-only model clients,
request parsing, and OpenAI orchestration live under `src/features/ai/server/`;
the shared NailSpec domain helpers live in `src/lib/nuvii-ai.ts`.

From this directory, install and start the frontend with:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure the server-only proxy target in `.env.local`:

```bash
NUVII_AI_SERVICE_URL=http://127.0.0.1:8000
```

Do not use a `NEXT_PUBLIC_` variable for the service URL, LoRA path, or API key.
The browser calls `/api/ai/*`; only the Next.js server calls FastAPI.

The Next.js server expects the local AI service at `http://127.0.0.1:8000` by default.
Run both services from the repository root with `./scripts/start-all.sh`.
