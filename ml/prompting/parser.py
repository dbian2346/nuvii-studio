"""Rule-based nail prompt normalization used before model inference."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

SHAPES = ("almond", "stiletto", "square", "soft square", "coffin", "oval", "round", "squoval", "ballerina")
LENGTHS = ("xs", "short", "medium", "long", "xl")
FINISHES = ("glossy", "matte", "jelly", "glazed", "pearl", "chrome", "glitter", "shimmer", "magnetic", "translucent")
TECHNIQUES = {
    "french": "curved_french",
    "french tip": "curved_french",
    "reverse french": "reverse_french",
    "aura": "aura",
    "ombre": "ombre",
    "ombré": "ombre",
    "marble": "marble",
    "isolated chrome": "isolated_chrome",
    "chrome outline": "chrome_outline",
    "cat eye": "cat_eye",
    "cat-eye": "cat_eye",
    "3d swirl": "3d_swirl",
    "3d swirls": "3d_swirl",
    "shell": "sculpted_shell",
    "3d flower": "raised_flower",
    "bubble": "bubble_accents",
    "bubbles": "bubble_accents",
}
MOTIFS = ("flower", "butterfly", "bow", "heart", "star", "leaf", "swirl", "ripple", "shell", "zebra", "cheetah", "celestial")
EMBELLISHMENTS = ("rhinestone", "pearl", "caviar beads", "chain", "charm", "gem")
PLACEMENTS = ("tip", "cuticle", "center", "side", "border", "diagonal", "scattered")

@dataclass(slots=True)
class NailPrompt:
    raw_prompt: str
    shape: str = "almond"
    length: str = "medium"
    finishes: list[str] = field(default_factory=list)
    techniques: list[str] = field(default_factory=list)
    motifs: list[str] = field(default_factory=list)
    embellishments: list[str] = field(default_factory=list)
    placements: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        return asdict(self)

def _contains(text: str, phrase: str) -> bool:
    return bool(re.search(rf"\b{re.escape(phrase)}\b", text))

def parse_nail_prompt(prompt: str) -> NailPrompt:
    if not prompt or not prompt.strip():
        raise ValueError("Prompt must not be empty.")

    text = prompt.lower().strip()
    result = NailPrompt(raw_prompt=prompt.strip())

    for shape in SHAPES:
        if _contains(text, shape):
            result.shape = shape.replace(" ", "_")
            break

    for length in LENGTHS:
        if _contains(text, length):
            result.length = length
            break

    result.finishes = [value for value in FINISHES if _contains(text, value)]
    result.techniques = sorted({normalized for phrase, normalized in TECHNIQUES.items() if phrase in text})
    result.motifs = [value for value in MOTIFS if _contains(text, value)]
    result.embellishments = [value.replace(" ", "_") for value in EMBELLISHMENTS if value in text]
    result.placements = [value for value in PLACEMENTS if _contains(text, value)]
    return result

def build_generation_prompt(parsed: NailPrompt) -> str:
    details = [
        "NUV11NAIL",
        f"single isolated {parsed.length} {parsed.shape.replace('_', ' ')} press-on nail",
        "front view",
        "centered on a plain white background",
        parsed.raw_prompt,
    ]
    return ", ".join(part for part in details if part)
