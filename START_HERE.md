# Start Here — Nuvii Studio Smart AI v6

This build combines the editable Nuvii nail editor, your trained SSD-1B LoRA, three saved LoRA checkpoints, a deterministic asset controller, optional OpenAI structured prompt interpretation, and optional OpenAI visual quality control.

## 1. Start Nuvii locally

Install Node.js 20.9 or newer and Python 3.9 or newer first. Python 3.11 is
recommended. From Terminal:

```bash
cd ~/Downloads/nuvii-studio-smart-ai-v6
cp apps/ai-service/.env.example apps/ai-service/.env.local
# Set NUVII_LORA_PATH in that file if the LoRA is outside the project.
chmod +x scripts/*.sh
./scripts/start-all.sh
```

Keep that Terminal window open, then open `http://localhost:3000`.

The first image-generation request downloads the SSD-1B base model and the MPS-safe VAE. Model weights are not committed to the repository; `NUVII_LORA_PATH` must point to your trained local file or the file must use the default location below.

The startup script creates `apps/ai-service/.venv`, installs the Python
requirements when they change, waits for FastAPI on `127.0.0.1:8000`, and then
starts Next.js on `localhost:3000`. It does not report AI readiness until
`/health` returns `status: ok` with `loraConfigured: true`.

To run the services in separate terminals instead:

```bash
./scripts/start-ai.sh
```

```bash
./scripts/start-studio.sh
```

The frontend can also be installed manually with `cd apps/studio && npm install`.
For a manual AI-service install from the repository root:

```bash
python3.11 -m venv apps/ai-service/.venv
source apps/ai-service/.venv/bin/activate
python -m pip install -r apps/ai-service/requirements.txt
```

The trained files belong in:

```text
apps/ai-service/model/pytorch_lora_weights.safetensors
apps/ai-service/model/checkpoints/nuvii-800.safetensors
apps/ai-service/model/checkpoints/nuvii-1000.safetensors
apps/ai-service/model/checkpoints/nuvii-1200.safetensors
```

Only the final adapter is required. To keep it elsewhere, edit
`apps/ai-service/.env.local`:

```bash
NUVII_LORA_PATH=/absolute/path/to/pytorch_lora_weights.safetensors
```

The browser never receives that path. The Next.js server uses this separate
server-only setting in `apps/studio/.env.local`:

```bash
NUVII_AI_SERVICE_URL=http://127.0.0.1:8000
```

## 2. Enable the OpenAI controller (recommended)

Nuvii works without OpenAI, but OpenAI adds:

- natural-language → strict NailSpec conversion;
- smarter choice between editable library assets and diffusion;
- reference-image interpretation;
- candidate image judging for prompt adherence.

After you have an OpenAI API key, run:

```bash
./scripts/configure-openai.sh
```

The script asks for the key without placing it in your shell history. It stores it in `apps/studio/.env.local`, which is ignored by Git. Restart `./scripts/start-all.sh` afterward.

Never place an API key in browser code or in a `NEXT_PUBLIC_...` environment variable.

## 3. How Smart Generate works

1. Your prompt becomes a structured NailSpec.
2. If Nuvii already has the requested elements (bows, French tips, rhinestones, chrome, pearls, etc.), the editor places them as deterministic editable layers instead of asking diffusion to approximate them.
3. If the request contains novel artwork, Nuvii generates diversified candidates using checkpoints 800/1000/1200 at different LoRA strengths.
4. In Balanced/Quality mode, an OpenAI vision-capable model can compare the candidates against the NailSpec and choose the closest match.
5. The winning generative art is masked into the selected nail and remains an editable image layer; known assets remain separate layers.

## 4. Quality modes

- **Fast** — 1 image candidate; fastest local inference.
- **Balanced** — 2 diversified LoRA candidates.
- **Quality** — 3 diversified candidates; when OpenAI is configured, visual QC chooses the best prompt match.

Known-library requests may skip diffusion entirely because deterministic layers are more accurate and faster.

## 5. Diagnostics

```bash
./scripts/doctor.sh
```

The AI-service log is at `logs/ai-service.log`.

Verify the service directly:

```bash
curl http://127.0.0.1:8000/health
```

`status: "ok"` means FastAPI is running, `loraConfigured: true` means the exact
configured file is readable, and `modelLoaded` changes from `false` to `true`
after the first real generation.

On Apple Silicon, Nuvii selects Metal/MPS automatically and decodes with the
float32 safe VAE to avoid black images. The first Smart Generate request needs a
network connection and several gigabytes of free disk space for the Hugging
Face model cache. CPU fallback works but is much slower.

Common fixes:

- **Missing LoRA:** set `NUVII_LORA_PATH` to an existing readable `.safetensors` file. The startup message prints the exact failed path.
- **AI service unavailable:** run `./scripts/start-ai.sh`, wait for `/health`, and choose Retry in Nuvii.
- **Model loading failure:** inspect `logs/ai-service.log`, confirm the base-model download can reach Hugging Face, and check free disk space.
- **Black generated image:** restart the AI service so the safe VAE reloads.
- **Port already in use:** stop the process using port 3000 or 8000, then restart.
- **Python dependency error:** remove only `apps/ai-service/.venv` and rerun `./scripts/start-ai.sh`.

## 6. Improve the next LoRA

Audit the caption balance of the full training dataset:

```bash
python3 ml/training/audit_caption_balance.py /path/to/train_imagefolder
```

Use `ml/training/CAPTION_STANDARD.md` before retraining. Once the service is running, compare checkpoint/strength combinations with:

```bash
python3 ml/evaluation/benchmark_checkpoints.py
```
