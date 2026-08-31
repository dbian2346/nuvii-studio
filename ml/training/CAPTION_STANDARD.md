# Nuvii Caption Standard v2

Use a controlled vocabulary rather than marketing prose. Keep the same field order and the same term for the same visual concept.

```text
NUV11NAIL, single almond press-on nail,
base: light pink,
effect: pink aura,
finish: glossy,
design: silver chrome bow,
accent: clear rhinestones,
bow position: upper center,
rhinestones position: cuticle
```

## Canonical terms

Use these exact terms whenever they apply: `French tip`, `aura`, `ombre`, `silver chrome bow`, `gold chrome bow`, `rhinestone`, `pearl`, `caviar beads`, `3D flower`, `gel swirl`, `shell relief`, `gel bubbles`, `starburst`, `cheetah print`, `zebra print`, `butterfly`.

## Balance target

For concepts the product promises to understand, aim for at least 20 clear examples per concept before retraining. High-priority concepts should have 30–50+ varied examples. Avoid letting nude/milky/pink bases dominate the dataset without equally strong decoration labels.

## Next training experiment

1. Audit captions with `python3 ml/training/audit_caption_balance.py <train_imagefolder>`.
2. Add examples for weak concepts.
3. Keep a fixed 15–20 prompt evaluation set and fixed seeds.
4. Compare checkpoints 800/1000/1200 and LoRA strengths 0.6/0.75/0.9.
5. Only after the vocabulary is balanced, test a 768 px training run for fine charms, chrome lines, and rhinestones.
