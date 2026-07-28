# Dataset Card: Nuvii Nail Design Dataset v1

## Summary

The private dataset contains 200 individual press-on nail crops derived from 20 original Nuvii sets. Every source image is user-owned and approved for model training.

## Splits

- Train: 140 images
- Validation: 30 images
- Test: 30 images

Splits are performed by source set so visually related nails never appear across multiple splits.

## Format

Each image has a matching `.txt` caption. Each split also includes `metadata.jsonl` records with `file_name` and `text` fields.

## Labels

Captions describe shape, length, base colour, finish, dimensionality, technique, motifs, embellishments, placement and style family. The controlled vocabulary is stored in `ml/schemas/label_dictionary.md`.

## Distribution

Raw photos, cropped training images, masks and transparent files are private and are not committed to GitHub. `ml/data/sample` is synthetic and exists only to test tooling.

## Limitations

The dataset reflects one artist's portfolio and is not representative of every nail style, skin tone, lighting condition or manufacturing method. Future versions should add more shapes, lengths, minimal designs and current trends while preserving ownership and consent.
