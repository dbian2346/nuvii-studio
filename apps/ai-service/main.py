from __future__ import annotations

import base64
import io
import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List, Literal, Optional, Tuple

import diffusers
import torch
from diffusers import AutoencoderKL, StableDiffusionXLPipeline
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_MODEL = os.getenv("NUVII_BASE_MODEL", "segmind/SSD-1B")
HERE = Path(__file__).resolve().parent
MODEL_DIR = HERE / "model"


def _configured_path(environment_name: str, default: Path) -> Path:
    configured = Path(os.getenv(environment_name, str(default))).expanduser()
    return configured if configured.is_absolute() else HERE / configured


LORA_PATH_WAS_EXPLICIT = (
    os.getenv("NUVII_LORA_EXPLICIT", "").strip() == "1"
    or (
        bool(os.getenv("NUVII_LORA_PATH", "").strip())
        and os.getenv("NUVII_LORA_EXPLICIT", "").strip() != "0"
    )
)
FINAL_LORA_PATH = _configured_path(
    "NUVII_LORA_PATH",
    MODEL_DIR / "pytorch_lora_weights.safetensors",
)
CHECKPOINT_DIR = _configured_path("NUVII_CHECKPOINT_DIR", MODEL_DIR / "checkpoints")
SAFE_VAE_MODEL = os.getenv("NUVII_VAE_MODEL", "madebyollin/sdxl-vae-fp16-fix")
DEFAULT_STEPS = int(os.getenv("NUVII_STEPS", "30"))
DEFAULT_GUIDANCE = float(os.getenv("NUVII_GUIDANCE", "9.0"))
logger = logging.getLogger("uvicorn.error")

DEFAULT_NEGATIVE_PROMPT = (
    "hand, hands, finger, fingers, thumb, skin, cuticle, person, human anatomy, "
    "multiple nails, nail set, nail polish bottle, manicure tools, packaging, text, "
    "logo, watermark, cropped nail, duplicate nail, malformed nail, blurry, low detail, "
    "plain undecorated nail, plain nude nail, bare nail, empty nail, blank nail, "
    "missing requested decorations"
)

COLOR_NAMES: Dict[str, Tuple[int, int, int]] = {
    "milky white": (250, 247, 244),
    "blush pink": (239, 191, 208),
    "ballet pink": (247, 220, 229),
    "lavender": (200, 182, 223),
    "cherry red": (149, 22, 61),
    "chocolate brown": (97, 57, 47),
    "sage green": (169, 184, 158),
    "sky blue": (172, 212, 232),
    "butter yellow": (244, 223, 160),
    "tangerine orange": (239, 143, 98),
    "black": (37, 37, 37),
    "cobalt blue": (47, 73, 176),
    "burgundy": (112, 31, 50),
    "silver": (190, 195, 204),
    "gold": (199, 158, 76),
}

def _validate_lora_configuration() -> None:
    if not FINAL_LORA_PATH.exists():
        raise RuntimeError(f"Configured Nuvii LoRA was not found at {FINAL_LORA_PATH}")
    if not FINAL_LORA_PATH.is_file():
        raise RuntimeError(f"Configured Nuvii LoRA path is not a file: {FINAL_LORA_PATH}")
    try:
        with FINAL_LORA_PATH.open("rb"):
            pass
    except OSError as exc:
        raise RuntimeError(
            f"Configured Nuvii LoRA is not readable at {FINAL_LORA_PATH}: {exc}"
        ) from exc


@asynccontextmanager
async def lifespan(_: FastAPI):
    _validate_lora_configuration()
    logger.info("Configured Nuvii LoRA: %s", FINAL_LORA_PATH)
    yield


app = FastAPI(title="Nuvii AI Service", version="3.1.0", lifespan=lifespan)

allowed_origins = [
    value.strip()
    for value in os.getenv(
        "NUVII_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if value.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1800)
    shape: Literal["almond", "oval", "square", "coffin", "stiletto"] = "almond"
    length: Literal["short", "medium", "long"] = "medium"
    baseColor: str = "#f7dce5"
    finish: Literal["glossy", "matte", "chrome", "glitter", "jelly"] = "glossy"
    negativePrompt: Optional[str] = Field(default=None, max_length=1800)
    seed: Optional[int] = Field(default=None, ge=0, le=2_147_483_647)
    steps: Optional[int] = Field(default=None, ge=10, le=60)
    loraScale: float = Field(default=0.72, ge=0.0, le=1.4)
    checkpoint: Literal["800", "1000", "1200", "final"] = "1000"


class GenerateCandidatesRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1800)
    shape: Literal["almond", "oval", "square", "coffin", "stiletto"] = "almond"
    length: Literal["short", "medium", "long"] = "medium"
    baseColor: str = "#f7dce5"
    finish: Literal["glossy", "matte", "chrome", "glitter", "jelly"] = "glossy"
    negativePrompt: Optional[str] = Field(default=None, max_length=1800)
    seed: Optional[int] = Field(default=None, ge=0, le=2_147_483_647)
    steps: Optional[int] = Field(default=None, ge=10, le=60)
    count: int = Field(default=3, ge=1, le=4)


_pipe: Optional[StableDiffusionXLPipeline] = None
_pipe_lock = threading.Lock()
_generation_lock = threading.Lock()
_device = "unloaded"
_available_adapters: Dict[str, str] = {}


def _hex_to_name(value: str) -> str:
    value = value.strip().lstrip("#")
    if len(value) != 6:
        return "soft pink"
    try:
        rgb = tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))
    except ValueError:
        return "soft pink"

    def distance(target: Tuple[int, int, int]) -> int:
        return sum((a - b) ** 2 for a, b in zip(rgb, target))

    return min(COLOR_NAMES, key=lambda name: distance(COLOR_NAMES[name]))


def _resolve_device() -> Tuple[str, torch.dtype]:
    requested = os.getenv("NUVII_DEVICE", "auto").lower().strip()

    if requested == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError("NUVII_DEVICE=cuda was requested, but CUDA is not available.")
        return "cuda", torch.float16

    if requested == "mps":
        if not (hasattr(torch.backends, "mps") and torch.backends.mps.is_available()):
            raise RuntimeError("NUVII_DEVICE=mps was requested, but Apple Metal/MPS is not available.")
        return "mps", torch.float16

    if requested == "cpu":
        return "cpu", torch.float32

    if torch.cuda.is_available():
        return "cuda", torch.float16
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps", torch.float16
    return "cpu", torch.float32


def _adapter_sources() -> List[Tuple[str, Path]]:
    # An explicitly configured LoRA is authoritative. Do not silently substitute
    # repository checkpoints when a user points Nuvii at a specific trained file.
    if LORA_PATH_WAS_EXPLICIT:
        return [("final", FINAL_LORA_PATH)] if FINAL_LORA_PATH.exists() else []

    sources: List[Tuple[str, Path]] = []
    for checkpoint in ("800", "1000", "1200"):
        path = CHECKPOINT_DIR / f"nuvii-{checkpoint}.safetensors"
        if path.exists():
            sources.append((checkpoint, path))
    # The root final adapter is the same 1,200-step save in this training run.
    # Avoid loading it twice when checkpoint 1200 is available.
    if FINAL_LORA_PATH.exists() and not any(name == "1200" for name, _ in sources):
        sources.append(("final", FINAL_LORA_PATH))
    return sources


def _load_pipeline() -> StableDiffusionXLPipeline:
    global _pipe, _device, _available_adapters

    if _pipe is not None:
        return _pipe

    with _pipe_lock:
        if _pipe is not None:
            return _pipe

        sources = _adapter_sources()
        if not sources:
            raise RuntimeError("No Nuvii LoRA weights were found in apps/ai-service/model.")

        device, dtype = _resolve_device()
        _device = device

        # SDXL-family VAEs can overflow in fp16 and decode to black on Apple MPS.
        # Keep the VAE in fp32 on MPS while the UNet/text encoders remain fp16.
        vae_dtype = torch.float32 if device == "mps" else dtype
        vae = AutoencoderKL.from_pretrained(
            SAFE_VAE_MODEL,
            torch_dtype=vae_dtype,
            use_safetensors=True,
        )

        kwargs: Dict[str, object] = {
            "torch_dtype": dtype,
            "use_safetensors": True,
            "vae": vae,
        }
        if device in {"cuda", "mps"}:
            kwargs["variant"] = "fp16"

        pipe = StableDiffusionXLPipeline.from_pretrained(BASE_MODEL, **kwargs)

        loaded: Dict[str, str] = {}
        for checkpoint, path in sources:
            adapter_name = f"nuvii_{checkpoint}"
            try:
                pipe.load_lora_weights(
                    str(path.parent),
                    weight_name=path.name,
                    adapter_name=adapter_name,
                )
                loaded[checkpoint] = adapter_name
            except Exception as exc:
                # A duplicate/final adapter should never prevent the service from starting.
                print(f"Could not load adapter {checkpoint}: {exc}")

        if not loaded:
            raise RuntimeError("The Nuvii LoRA files were present but none could be loaded.")

        _available_adapters = loaded

        if device != "mps" and hasattr(pipe, "enable_attention_slicing"):
            pipe.enable_attention_slicing()
        if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_slicing"):
            pipe.vae.enable_slicing()

        if device == "cuda":
            try:
                pipe.enable_model_cpu_offload()
            except Exception:
                pipe.to("cuda")
        else:
            pipe.to(device)

        _pipe = pipe
        return pipe


def _activate_adapter(pipe: StableDiffusionXLPipeline, checkpoint: str, scale: float) -> Tuple[str, float]:
    # Prefer the requested checkpoint. Fall back in a prompt-friendly order.
    choices = [checkpoint, "1000", "1200", "800", "final"]
    selected = next((item for item in choices if item in _available_adapters), None)
    if selected is None:
        raise RuntimeError("No loaded Nuvii adapter is available.")

    adapter_name = _available_adapters[selected]
    if hasattr(pipe, "set_adapters"):
        pipe.set_adapters(adapter_name, adapter_weights=scale)
    return selected, scale


def _build_prompt(request: GenerateRequest) -> str:
    color_name = _hex_to_name(request.baseColor)
    raw = " ".join(request.prompt.split())
    if raw.upper().startswith("NUV11NAIL"):
        raw = raw[len("NUV11NAIL"):].lstrip(" ,.-")
    # SSD-1B uses a CLIP context window. Keep the requested art first and bound the
    # planner fragment so shape/material guidance is not silently truncated.
    raw = " ".join(raw.split()[:24])
    return (
        f"NUV11NAIL, {raw}, one isolated {request.length} {request.shape} press-on nail, "
        f"{color_name} {request.finish} base, centered front view, white background"
    )


def _negative_prompt(extra: Optional[str]) -> str:
    if not extra:
        return DEFAULT_NEGATIVE_PROMPT
    return f"{DEFAULT_NEGATIVE_PROMPT}, {extra.strip()}"


def _image_to_data_uri(image) -> str:
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _ensure_valid_decode(image) -> None:
    extrema = image.convert("RGB").getextrema()
    brightest = max(channel[1] for channel in extrema)
    if brightest <= 5:
        raise RuntimeError(
            "Generation decoded to an all-black image. Restart the AI service once so the fp32 VAE reloads."
        )


def _generate_one(request: GenerateRequest) -> Dict[str, object]:
    pipe = _load_pipeline()
    seed = request.seed if request.seed is not None else int.from_bytes(os.urandom(4), "big") % 2_147_483_647
    steps = request.steps or DEFAULT_STEPS
    prompt = _build_prompt(request)
    logger.info("Generation prompt (%d words): %s", len(prompt.split()), prompt)
    generator_device = "cuda" if _device == "cuda" else "cpu"
    generator = torch.Generator(device=generator_device).manual_seed(seed)

    checkpoint, scale = _activate_adapter(pipe, request.checkpoint, request.loraScale)

    image = pipe(
        prompt=prompt,
        negative_prompt=_negative_prompt(request.negativePrompt),
        width=512,
        height=768,
        num_inference_steps=steps,
        guidance_scale=DEFAULT_GUIDANCE,
        generator=generator,
    ).images[0]
    _ensure_valid_decode(image)

    return {
        "dataURI": _image_to_data_uri(image),
        "seed": seed,
        "checkpoint": checkpoint,
        "loraScale": scale,
        "prompt": prompt,
    }


@app.get("/health")
def health() -> Dict[str, object]:
    detected_device, _ = _resolve_device()
    return {
        "status": "ok",
        "ok": True,
        "service": "nuvii-trained-ai",
        "model": BASE_MODEL,
        "baseModel": BASE_MODEL,
        "loraConfigured": FINAL_LORA_PATH.is_file() and os.access(FINAL_LORA_PATH, os.R_OK),
        "loraFile": FINAL_LORA_PATH.name,
        "loraPresent": bool(_adapter_sources()),
        "checkpointFiles": [name for name, _ in _adapter_sources()],
        "loadedAdapters": list(_available_adapters.keys()),
        "modelLoaded": _pipe is not None,
        "device": _device if _pipe is not None else detected_device,
        "diffusersVersion": getattr(diffusers, "__version__", "unknown"),
        "vaeModel": SAFE_VAE_MODEL,
        "mpsSafeMode": detected_device == "mps",
    }


@app.post("/generate")
def generate(request: GenerateRequest) -> Dict[str, object]:
    try:
        with _generation_lock:
            result = _generate_one(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}") from exc

    result.update({
        "model": "Nuvii SSD-1B LoRA",
        "shape": request.shape,
        "length": request.length,
    })
    return result


@app.post("/generate-candidates")
def generate_candidates(request: GenerateCandidatesRequest) -> Dict[str, object]:
    # We intentionally diversify checkpoint + LoRA strength. The lower LoRA strengths
    # preserve more of SSD-1B's base prompt-following ability, while later checkpoints
    # preserve more Nuvii style. The OpenAI judge in the Next.js layer selects the best.
    presets = [
        ("1000", 0.62),
        ("1200", 0.72),
        ("800", 0.82),
        ("1000", 0.90),
    ][: request.count]

    base_seed = request.seed if request.seed is not None else int.from_bytes(os.urandom(4), "big") % 2_147_483_647
    candidates: List[Dict[str, object]] = []

    try:
        _load_pipeline()
        with _generation_lock:
            for index, (checkpoint, scale) in enumerate(presets):
                seed = (base_seed + index * 7919) % 2_147_483_647
                item = GenerateRequest(
                    prompt=request.prompt,
                    shape=request.shape,
                    length=request.length,
                    baseColor=request.baseColor,
                    finish=request.finish,
                    negativePrompt=request.negativePrompt,
                    seed=seed,
                    steps=request.steps,
                    loraScale=scale,
                    checkpoint=checkpoint,
                )
                candidate = _generate_one(item)
                candidate["index"] = index
                candidates.append(candidate)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Candidate generation failed: {exc}") from exc

    return {
        "candidates": candidates,
        "model": "Nuvii SSD-1B LoRA ensemble",
        "shape": request.shape,
        "length": request.length,
    }
