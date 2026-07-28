"""Generate one Nuvii nail image from a trained SSD-1B LoRA."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from diffusers import StableDiffusionXLPipeline

from ml.prompting.parser import build_generation_prompt, parse_nail_prompt

NEGATIVE_PROMPT = (
    "hand, finger, skin, multiple nails, nail set, text, watermark, packaging, "
    "bottle, salon scene, cropped nail, blurry, malformed"
)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lora", required=True, help="Path to the trained LoRA directory or weights file.")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", default="generated_nail.png")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--steps", type=int, default=30)
    args = parser.parse_args()

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is required for this inference script.")

    parsed = parse_nail_prompt(args.prompt)
    model_prompt = build_generation_prompt(parsed)

    pipe = StableDiffusionXLPipeline.from_pretrained(
        "segmind/SSD-1B",
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
    )
    pipe.load_lora_weights(args.lora)
    pipe.enable_xformers_memory_efficient_attention()
    pipe.to("cuda")

    generator = torch.Generator(device="cuda").manual_seed(args.seed)
    image = pipe(
        prompt=model_prompt,
        negative_prompt=NEGATIVE_PROMPT,
        width=512,
        height=768,
        num_inference_steps=args.steps,
        guidance_scale=8.0,
        generator=generator,
    ).images[0]

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
    print(output.resolve())

if __name__ == "__main__":
    main()
