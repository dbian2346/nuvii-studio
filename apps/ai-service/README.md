# Nuvii local image service

FastAPI + Diffusers service for the Nuvii SSD-1B nail-domain LoRA.

Model weights are intentionally excluded from Git. The default local layout is:

```text
model/pytorch_lora_weights.safetensors
model/checkpoints/nuvii-800.safetensors
model/checkpoints/nuvii-1000.safetensors
model/checkpoints/nuvii-1200.safetensors
```

The root file is the final 1,200-step save. v6 also keeps earlier checkpoints because full-strength final training is not automatically the best prompt-following configuration.
Only the final adapter is required. Optional checkpoint files provide additional
candidate diversity when the default model directory is used.

Endpoints:

- `GET /health`
- `POST /generate` — one specified checkpoint/LoRA-strength result
- `POST /generate-candidates` — diversified candidates for Smart AI

On Apple Silicon, Nuvii uses the fp16-safe SDXL VAE but keeps VAE decoding in float32 to avoid black-image failures.

Start through the repository root:

```bash
./scripts/start-all.sh
```

Or install and run this service by itself:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export NUVII_LORA_PATH=/absolute/path/to/pytorch_lora_weights.safetensors
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

For normal local use, copy `.env.example` to `.env.local`, set
`NUVII_LORA_PATH`, and run `../../scripts/start-ai.sh`. The startup script loads
that file, checks that the configured LoRA exists and is readable, and prints
the exact reason if startup cannot continue.

The service reports healthy before loading the large pipeline. The first
`/generate` or `/generate-candidates` request downloads SSD-1B and the safe VAE
when they are not already cached, then loads the configured local LoRA adapters. Check
the exact state through `GET /health`. `status` reports FastAPI readiness,
`loraConfigured` reports whether the exact configured adapter is readable,
`modelLoaded` distinguishes lazy pipeline loading, and `loadedAdapters` lists
the adapters loaded by the first generation.

The combined startup log is `logs/ai-service.log` at the repository root. If
health succeeds but generation fails, inspect that log for model-download,
adapter-loading, MPS, or disk-space errors.
