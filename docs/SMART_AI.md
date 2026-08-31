# Nuvii Smart AI Architecture

## Why v6 exists

A domain LoRA is good at learning a visual distribution, but it is not a reliable natural-language planner. With a small fashion/design dataset it can over-prioritize frequent training priors (for example, nude or milky bases) and ignore low-frequency decorations.

Nuvii v6 separates **understanding**, **construction**, **generation**, and **verification**.

```text
User prompt / reference
        │
        ▼
Structured NailSpec controller
(OpenAI when configured; deterministic fallback otherwise)
        │
        ├──────── known concepts ───────► Editable Nuvii layers
        │                                (bows, gems, French, aura, chrome...)
        │
        └──────── novel concepts ───────► SSD-1B + Nuvii LoRA ensemble
                                           │
                                      1–3 candidates
                                           │
                               OpenAI visual QC when configured
                                           │
                                           ▼
                                selected generated layer
        │
        └──────────────────────────────► Editable ten-nail canvas
```

## NailSpec

The controller returns a strict object containing shape, length, palette, finish, required concepts, forbidden concepts, render strategy, optimized diffusion prompt, negative prompt, and a five-finger editable layer plan. The editor mirrors that five-finger plan across left and right hands.

## Deterministic-first rendering

If a requested element exists in Nuvii's library, Smart AI uses the asset rather than regenerating it. This is the main prompt-adherence improvement because a known silver chrome bow can be placed exactly instead of relying on diffusion to draw one.

## LoRA ensemble

The local service contains checkpoints 800, 1000, and 1200. Quality generation diversifies both checkpoint and adapter strength:

- checkpoint 1000 at ~0.62 — stronger base-model prompt following;
- checkpoint 1200 at ~0.72 — balanced Nuvii domain style;
- checkpoint 800 at ~0.82 — alternative domain prior.

The selected combination is not assumed to be universally best; use the benchmark script to evaluate it on a fixed prompt set.

## Visual QC

When an OpenAI API key is configured, generated candidates are sent to a vision-capable OpenAI model together with the NailSpec. The judge scores prompt adherence, single-nail isolation, shape match, requested-detail presence, and aesthetics. Missing requested decoration or a plain/blank nail is heavily penalized.

## Privacy

- The OpenAI API key is only read on the Next.js server.
- It is never returned to the browser.
- Requests use `store: false` in the Responses API integration.
- Reference images are sent to OpenAI only when the user has configured OpenAI and uses the Smart AI generator with a reference image.
- In Balanced/Quality generative flows, candidate images may be sent to OpenAI for visual QC when OpenAI is configured.
