# Nuvii AI Worker

Optional Cloudflare Worker gateway for a deployed Nuvii GPU inference service.

Local development does **not** need this Worker. The studio can call `apps/ai-service` directly at `http://127.0.0.1:8000`.

For production, deploy the Python AI service to a GPU host, set `NUVII_MODEL_URL` to that service, then deploy this Worker as a browser-safe proxy.

```bash
npm install
npm run dev
```

Set `ALLOWED_ORIGINS` to the deployed Studio URL. If the GPU endpoint requires a bearer token, create the `NUVII_MODEL_TOKEN` Worker secret rather than placing it in source code.
