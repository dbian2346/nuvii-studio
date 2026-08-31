# Nuvii Nail Domain LoRA — Model Card

## Base model

`segmind/SSD-1B` (SDXL-family)

## Training

- 140 single-nail training images
- 1,200 maximum training steps
- 512 px training resolution
- LoRA rank 8
- Trigger token: `NUV11NAIL`
- Saved checkpoints: 800, 1000, 1200

## v6 serving strategy

Nuvii no longer assumes the final 1,200-step adapter at full strength is always optimal. The local inference service can activate checkpoints 800/1000/1200 at different adapter weights. Smart Generate uses lower LoRA weights for some candidates to preserve more of the base model's text-following behavior.

The LoRA is only responsible for novel generative artwork. Known product concepts are preferentially rendered through deterministic editor assets.

## Known limitations

The original dataset is relatively small and its concept frequencies are not perfectly balanced. Frequent base styles can become an unwanted prior; rare decorations can be under-learned. Fine elements such as tiny rhinestones and thin chrome lines are also challenging at a 512 px training resolution.

## Next training iteration

Before another run, audit caption/concept balance with `ml/training/audit_caption_balance.py`, apply `ml/training/CAPTION_STANDARD.md`, hold out a fixed prompt evaluation suite, compare checkpoints/scales, then consider a 768 px experiment after the dataset vocabulary is balanced.
