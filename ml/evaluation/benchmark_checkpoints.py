#!/usr/bin/env python3
"""Benchmark Nuvii LoRA checkpoints/scales against identical prompts and seeds.

Run while ./scripts/start-all.sh is active:
  python3 ml/evaluation/benchmark_checkpoints.py

Outputs images + a CSV manifest in ml/evaluation/results/.
"""
from __future__ import annotations

import base64
import csv
import json
import urllib.request
from pathlib import Path

API = "http://127.0.0.1:8000/generate"
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "results"
OUT.mkdir(parents=True, exist_ok=True)

PROMPTS = [
    "pink aura with a clearly visible silver chrome bow and three rhinestones near the cuticle",
    "dark cherry French tip with gold chrome starbursts and a fine gold smile line",
    "milky white base with raised 3D orchid, clear gel bubbles, and pearlescent shell detail",
    "cobalt blue jelly nail with silver chrome organic frame and tiny caviar beads",
    "sage green ombre with white sculpted flower and pearl center",
]
CONFIGS = [
    ("800", 0.60), ("800", 0.75), ("800", 0.90),
    ("1000", 0.60), ("1000", 0.75), ("1000", 0.90),
    ("1200", 0.60), ("1200", 0.75), ("1200", 0.90),
]
SEED = 424242

rows = []
for prompt_index, prompt in enumerate(PROMPTS, start=1):
    for checkpoint, scale in CONFIGS:
        payload = json.dumps({
            "prompt": prompt,
            "shape": "almond",
            "length": "medium",
            "baseColor": "#efbfd0",
            "seed": SEED + prompt_index,
            "steps": 30,
            "checkpoint": checkpoint,
            "loraScale": scale,
        }).encode("utf-8")
        request = urllib.request.Request(API, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=600) as response:
                result = json.loads(response.read())
            image_bytes = base64.b64decode(result["dataURI"].split(",", 1)[1])
            filename = f"p{prompt_index:02d}_ckpt{checkpoint}_scale{scale:.2f}.png"
            (OUT / filename).write_bytes(image_bytes)
            rows.append({
                "prompt_index": prompt_index,
                "prompt": prompt,
                "checkpoint": checkpoint,
                "lora_scale": scale,
                "seed": result.get("seed"),
                "file": filename,
                "status": "ok",
            })
            print("saved", filename)
        except Exception as exc:
            rows.append({
                "prompt_index": prompt_index,
                "prompt": prompt,
                "checkpoint": checkpoint,
                "lora_scale": scale,
                "seed": SEED + prompt_index,
                "file": "",
                "status": f"error: {exc}",
            })
            print("error", prompt_index, checkpoint, scale, exc)

with (OUT / "benchmark.csv").open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

print("\nBenchmark complete:", OUT)
print("Use the same prompts/seeds to visually compare prompt adherence rather than assuming the final checkpoint is best.")
