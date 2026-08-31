#!/usr/bin/env python3
"""Audit a Nuvii caption folder for concept imbalance.

Example:
  python3 ml/training/audit_caption_balance.py /path/to/train_imagefolder
"""
from __future__ import annotations

import argparse
import collections
from pathlib import Path

CONCEPTS = {
    "french_tip": ["french tip", "french"],
    "aura": ["aura", "halo"],
    "ombre": ["ombre", "gradient", "fade"],
    "bow": ["bow", "ribbon"],
    "rhinestone": ["rhinestone", "crystal", "gem"],
    "pearl": ["pearl"],
    "chrome": ["chrome", "metallic"],
    "3d_flower": ["3d flower", "raised flower", "sculpted flower", "orchid"],
    "swirl": ["swirl", "ripple"],
    "shell": ["shell", "seashell"],
    "bubble": ["bubble", "raindrop"],
    "caviar_beads": ["caviar", "micro bead"],
    "stars": ["star", "starburst", "sparkle"],
    "animal_print": ["cheetah", "leopard", "zebra", "animal print"],
    "butterfly": ["butterfly"],
}

parser = argparse.ArgumentParser()
parser.add_argument("folder", type=Path)
parser.add_argument("--target", type=int, default=20, help="Recommended minimum examples per important concept")
args = parser.parse_args()

captions = list(args.folder.glob("*.txt"))
if not captions:
    raise SystemExit(f"No .txt captions found in {args.folder}")

counts = collections.Counter()
for path in captions:
    text = path.read_text(errors="ignore").lower()
    for concept, terms in CONCEPTS.items():
        if any(term in text for term in terms):
            counts[concept] += 1

print(f"Captions: {len(captions)}\n")
print(f"{'Concept':<20} {'Count':>6}  Status")
print("-" * 42)
for concept in CONCEPTS:
    count = counts[concept]
    status = "OK" if count >= args.target else f"ADD {args.target - count}+"
    print(f"{concept:<20} {count:>6}  {status}")

print("\nTraining guidance: balance important vocabulary instead of simply adding more random nails.")
print("Use the same canonical words in every caption so the LoRA learns stable concept-token relationships.")
