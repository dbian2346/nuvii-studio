# Architecture

Nuvii Studio is split into three cooperating layers.

## `apps/studio` — Next.js editor

The browser editor manages ten nails, shapes, lengths, finishes, editable asset layers, uploads, save/export, the Smart AI modal, and reference-image palette extraction. Server-only API routes protect the OpenAI key and orchestrate AI calls.

Important routes:

- `GET /api/ai/status` — reports local-image/OpenAI-controller status.
- `POST /api/ai/interpret` — converts a prompt/reference into a structured NailSpec.
- `POST /api/ai/smart-generate` — deterministic-first planning, candidate generation, and optional visual judging.
- `POST /api/ai/generate` — legacy direct local-generation proxy.

## `apps/ai-service` — FastAPI + Diffusers

Loads `segmind/SSD-1B`, an MPS-safe SDXL VAE, and the trained Nuvii LoRA adapters. The service exposes single generation and diversified candidate generation. Checkpoint/strength diversification helps reduce overfitting to the dominant training prior.

## OpenAI controller — optional server-side enhancement

The Next.js server uses the Responses API with Structured Outputs to produce an exact NailSpec. A second multimodal call can judge candidate images. The application has a deterministic local fallback when no key is present or an OpenAI request fails.

See `docs/SMART_AI.md` for the complete flow.
