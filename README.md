# Nuvii Studio

**An AI-assisted, editable design studio for press-on nail artists.**

Nuvii Studio began as a workflow solution for a press-on nail business: custom designs were slow to sketch, revise, and translate across nail shapes. The editor turns that process into a ten-nail canvas with reusable layers, realistic nail shapes, design assets, save/export tools, and a domain-trained generative model.

![Nuvii Studio editor](docs/assets/editor.png)

## Smart AI v6

The newest build fixes the core weakness of using a small LoRA as the entire "brain" of the product. Instead of sending raw natural language straight to diffusion, Nuvii now uses a controller architecture:

1. **Interpret** — prompt/reference → structured NailSpec.
2. **Construct** — known concepts are placed as deterministic editable layers.
3. **Generate** — only novel artwork goes through SSD-1B + the trained Nuvii LoRA.
4. **Diversify** — checkpoints 800/1000/1200 and different LoRA strengths produce alternative candidates.
5. **Verify** — when OpenAI is configured, a multimodal judge checks the candidates against the requested NailSpec and chooses the best match.

This makes requests such as *"pink aura almond nails with a silver chrome bow and rhinestones"* deterministic for the aura, bow, rhinestones, palette, shape, and placement rather than hoping diffusion reproduces every detail.

## Features

- Ten-nail left/right canvas
- Almond, oval, square, coffin, and stiletto shapes
- Short, medium, and long lengths
- Base colours and glossy/matte/chrome/glitter/jelly finishes
- 2D art, 3D gel assets, charms, pearls, gems, chains, bows, isolated chrome
- Drag, resize, rotate, opacity, ordering, copy/paste, mirror hand
- Upload custom artwork and reference images
- Local save, project import/export, image export
- Structured Smart AI set planner
- Trained Nuvii SSD-1B LoRA
- 800/1000/1200 checkpoint ensemble
- Adjustable LoRA strength per candidate
- Optional OpenAI Structured Outputs controller
- Optional OpenAI visual prompt-adherence judge
- Deterministic local fallback when OpenAI is not configured
- Apple Silicon/MPS-safe VAE inference path

## Quick start

Requirements: Node.js 20.9 or newer and Python 3.9 or newer. Python 3.11 is
recommended for the local image service.

The repository does not commit model weights. Either place the trained file at
`apps/ai-service/model/pytorch_lora_weights.safetensors`, or configure its
absolute local location:

```bash
cp apps/ai-service/.env.example apps/ai-service/.env.local
# Edit .env.local:
NUVII_LORA_PATH=/absolute/path/to/pytorch_lora_weights.safetensors
```

```bash
cd nuvii-studio-smart-ai-v6
chmod +x scripts/*.sh
./scripts/start-all.sh
```

Open `http://localhost:3000`.

For the enhanced OpenAI controller, obtain an API key and run:

```bash
./scripts/configure-openai.sh
```

Restart `./scripts/start-all.sh` after configuration. The key stays in `apps/studio/.env.local`, which Git ignores.

See [START_HERE.md](START_HERE.md) for beginner-friendly setup.

### Install and run each service separately

The final trained adapter is required. The three checkpoint files are optional
and are used for candidate diversity when the default model directory is used:

```text
apps/ai-service/model/pytorch_lora_weights.safetensors
apps/ai-service/model/checkpoints/nuvii-800.safetensors
apps/ai-service/model/checkpoints/nuvii-1000.safetensors
apps/ai-service/model/checkpoints/nuvii-1200.safetensors
```

Install and start the local FastAPI service:

```bash
cd apps/ai-service
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export NUVII_LORA_PATH=/absolute/path/to/pytorch_lora_weights.safetensors
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

In a second terminal, install and start the frontend:

```bash
cd apps/studio
npm install
cp .env.example .env.local
npm run dev
```

`NUVII_AI_SERVICE_URL` must remain `http://127.0.0.1:8000` unless the local
service is intentionally moved. Add `OPENAI_API_KEY` to
`apps/studio/.env.local` to enable the optional OpenAI controller; never use a
`NEXT_PUBLIC_` variable for that key.

The diffusion pipeline is loaded only when Smart Generate is first used. On
that first request, Diffusers downloads SSD-1B and the safe SDXL VAE into the
Hugging Face cache, which requires a network connection, several gigabytes of
disk space, and can take several minutes. Later launches reuse that cache.

### Apple Silicon and troubleshooting

Apple Silicon runs through Metal/MPS automatically. Nuvii keeps VAE decoding in
float32 to prevent black output while the rest of the pipeline uses fp16. CPU
fallback is supported but substantially slower; close memory-intensive apps if
macOS reports memory pressure during generation.

- Run `./scripts/doctor.sh` to verify Node, Python, LoRA checksums, ports, and service health.
- Read `logs/ai-service.log` when `./scripts/start-all.sh` cannot make the service ready.
- If the LoRA is reported missing, set `NUVII_LORA_PATH` to the exact readable file; the startup error prints the path it checked.
- If the editor says the local AI service is unavailable, start `./scripts/start-ai.sh`, then use Retry.
- Verify readiness with `curl http://127.0.0.1:8000/health`; `status` must be `ok` and `loraConfigured` must be `true`. `modelLoaded` remains `false` until the first generation.
- If model loading fails after health succeeds, inspect `logs/ai-service.log` for the Diffusers/Hugging Face error and confirm network access and free disk space.
- If a generated image is black, restart the AI service so the float32 VAE reloads.
- If port 3000 or 8000 is already occupied, stop the existing process before restarting Nuvii.

## AI modes

### Build editable set

Creates the complete design as editor-native layers. This is preferred for concepts already in the Nuvii catalog because it is exact, fast, and fully editable.

### Smart Generate — Fast

One LoRA candidate. Useful while iterating.

### Smart Generate — Balanced

Two diversified candidates using different checkpoint/LoRA-strength combinations.

### Smart Generate — Quality

Three diversified candidates. With OpenAI configured, a vision-capable model evaluates prompt adherence, nail isolation, shape, requested-detail presence, and aesthetics, then returns the strongest result.

## Repository layout

```text
apps/
  studio/        Next.js editor + server-side AI orchestration
  ai-service/    FastAPI / Diffusers local image service
ml/
  notebooks/     training notebook
  evaluation/    checkpoint/LoRA-strength benchmark
  training/      dataset balance audit + caption standard
docs/
  SMART_AI.md    AI architecture and privacy notes
  ARCHITECTURE.md
scripts/
  start-all.sh
  configure-openai.sh
  doctor.sh
```

## Training improvement workflow

The current LoRA is useful, but the next training run should improve the data before simply increasing steps.

```bash
python3 ml/training/audit_caption_balance.py /path/to/train_imagefolder
```

Use a controlled caption vocabulary from `ml/training/CAPTION_STANDARD.md`. For concepts Nuvii promises to understand, target dozens of clear examples per concept and prevent nude/milky bases from dominating without explicit decoration labels. After balancing, test 768 px training for thin chrome, charms, and rhinestones.

While the local service is running, compare the saved adapters with identical prompts/seeds:

```bash
python3 ml/evaluation/benchmark_checkpoints.py
```

## Security and privacy

- Never commit `.env.local` or API keys.
- The OpenAI key is server-side only.
- OpenAI Responses requests in this build use `store: false`.
- Reference images/candidate images are only sent to OpenAI when the controller is configured and the relevant Smart AI flow is used.
- The private training dataset is intentionally excluded from the repository.
- Model weights are ignored by Git and must remain local.

## Model

See [MODEL_CARD.md](MODEL_CARD.md) and [DATASET_CARD.md](DATASET_CARD.md).
