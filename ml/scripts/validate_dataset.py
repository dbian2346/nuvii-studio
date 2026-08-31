"""Validate paired nail images, captions and optional metadata.jsonl."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

def validate(folder: Path) -> list[str]:
    errors: list[str] = []
    images = sorted(path for path in folder.iterdir() if path.suffix.lower() in IMAGE_EXTENSIONS)
    captions = {path.stem: path for path in folder.glob("*.txt")}

    if not images:
        errors.append("No images found.")

    for image_path in images:
        caption_path = captions.get(image_path.stem)
        if caption_path is None:
            errors.append(f"Missing caption: {image_path.name}")
        elif not caption_path.read_text(encoding="utf-8").strip():
            errors.append(f"Empty caption: {caption_path.name}")

        try:
            with Image.open(image_path) as image:
                image.verify()
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Invalid image {image_path.name}: {exc}")

    image_stems = {path.stem for path in images}
    for stem, caption_path in captions.items():
        if stem not in image_stems:
            errors.append(f"Caption without image: {caption_path.name}")

    metadata_path = folder / "metadata.jsonl"
    if metadata_path.exists():
        for line_number, line in enumerate(metadata_path.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"Invalid metadata JSON on line {line_number}: {exc}")
                continue
            if "file_name" not in record or "text" not in record:
                errors.append(f"Metadata line {line_number} requires file_name and text.")
    return errors

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    if not args.folder.is_dir():
        raise SystemExit(f"Not a directory: {args.folder}")
    errors = validate(args.folder)
    if errors:
        print("Dataset validation failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)
    print(f"Dataset is valid: {args.folder}")

if __name__ == "__main__":
    main()
