"""Generate one Nuvii nail image using any bundled checkpoint and LoRA strength."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, Tuple

import torch
from diffusers import AutoencoderKL, StableDiffusionXLPipeline

from ml.prompting.parser import build_generation_prompt, parse_nail_prompt

NEGATIVE_PROMPT = (
    "hand, hands, finger, fingers, thumb, skin, person, multiple nails, nail set, "
    "plain undecorated nail, bare nail, missing requested decorations, text, watermark, "
    "packaging, bottle, salon scene, cropped nail, blurry, malformed"
)

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "apps" / "ai-service" / "model"
CHECKPOINTS: Dict[str, Path] = {
    "final": MODEL_DIR / "pytorch_lora_weights.safetensors",
    "800": MODEL_DIR / "checkpoints" / "nuvii-800.safetensors",
    "1000": MODEL_DIR / "checkpoints" / "nuvii-1000.safetensors",
    "1200": MODEL_DIR / "checkpoints" / "nuvii-1200.safetensors",
}


def choose_device() -> Tuple[str, torch.dtype]:
    if torch.cuda.is_available():
        return "cuda", torch.float16
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps", torch.float16
    return "cpu", torch.float32


def resolve_lora(checkpoint: str, explicit_lora: str | None) -> Path:
    if explicit_lora:
        return Path(explicit_lora).expanduser().resolve()
    try:
        return CHECKPOINTS[checkpoint]
    except KeyError as exc:
        raise ValueError(f"Unknown checkpoint {checkpoint!r}. Choose one of: {', '.join(CHECKPOINTS)}") from exc


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--checkpoint",
        choices=list(CHECKPOINTS),
        default="1000",
        help="Bundled Nuvii checkpoint. 1000 is the prompt-adherence default; final/1200 is the fully trained adapter.",
    )
    parser.add_argument(
        "--lora",
        default=None,
        help="Optional explicit .safetensors path. Overrides --checkpoint.",
    )
    parser.add_argument(
        "--lora-scale",
        type=float,
        default=0.72,
        help="Adapter strength. Lower values preserve more base-model prompt following; typical useful range is 0.55-0.95.",
    )
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", default="generated_nail.png")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--steps", type=int, default=30)
    parser.add_argument("--guidance", type=float, default=9.0)
    args = parser.parse_args()

    if not 0.0 <= args.lora_scale <= 1.5:
        raise ValueError("--lora-scale must be between 0.0 and 1.5")

    lora_path = resolve_lora(args.checkpoint, args.lora)
    if not lora_path.exists():
        raise FileNotFoundError(f"LoRA weights not found: {lora_path}")

    device, dtype = choose_device()
    print(f"Device: {device}")
    print(f"LoRA: {lora_path}")
    print(f"LoRA scale: {args.lora_scale:.2f}")
    if device == "cpu":
        print("Warning: CPU generation is supported as a fallback but will be very slow.")

    parsed = parse_nail_prompt(args.prompt)
    model_prompt = build_generation_prompt(parsed)
    # Re-emphasize adherence because the first LoRA tends to collapse toward common nude looks.
    model_prompt = (
        f"{model_prompt}, every requested decoration clearly visible, no omitted design elements, "
        "strong visual distinction between the base color and nail art"
    )

    load_kwargs: dict[str, object] = {
        "torch_dtype": dtype,
        "use_safetensors": True,
    }
    if device in {"cuda", "mps"}:
        load_kwargs["variant"] = "fp16"

    vae = AutoencoderKL.from_pretrained(
        "madebyollin/sdxl-vae-fp16-fix",
        torch_dtype=torch.float32 if device == "mps" else dtype,
        use_safetensors=True,
    )
    load_kwargs["vae"] = vae

    pipe = StableDiffusionXLPipeline.from_pretrained("segmind/SSD-1B", **load_kwargs)
    adapter_name = f"nuvii_{args.checkpoint}"
    pipe.load_lora_weights(str(lora_path.parent), weight_name=lora_path.name, adapter_name=adapter_name)
    pipe.set_adapters(adapter_name, adapter_weights=float(args.lora_scale))

    if device != "mps" and hasattr(pipe, "enable_attention_slicing"):
        pipe.enable_attention_slicing()
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_slicing"):
        pipe.vae.enable_slicing()
    pipe.to(device)
    if device == "mps":
        pipe.vae.to(dtype=torch.float32)

    generator_device = "cuda" if device == "cuda" else "cpu"
    generator = torch.Generator(device=generator_device).manual_seed(args.seed)
    image = pipe(
        prompt=model_prompt,
        negative_prompt=NEGATIVE_PROMPT,
        width=512,
        height=768,
        num_inference_steps=args.steps,
        guidance_scale=args.guidance,
        generator=generator,
    ).images[0]

    extrema = image.convert("RGB").getextrema()
    if max(channel[1] for channel in extrema) <= 3:
        raise RuntimeError("The model decoded an all-black image. On Apple Silicon, restart the service and keep the safe VAE enabled.")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
    print(output.resolve())


if __name__ == "__main__":
    main()
