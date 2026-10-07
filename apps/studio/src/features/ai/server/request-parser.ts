import type {
  Finger,
  NailFinish,
  NailLength,
  NailShape,
} from "@/features/editor/domain/types";
import type { AiQualityMode } from "../domain/types";

const DEFAULT_BASE_COLOR = "#f7dce5";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MAX_REFERENCE_DATA_URI_LENGTH = 5_600_000;
const REFERENCE_DATA_URI = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;

export interface ParsedAiRequest {
  baseColor: string;
  forceDiffusion: boolean;
  finish: NailFinish;
  length: NailLength;
  prompt: string;
  qualityMode: AiQualityMode;
  referenceImage?: string;
  referencePalette?: string[];
  selectedFinger: Finger;
  shape: NailShape;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nailShape(value: unknown): NailShape {
  switch (value) {
    case "almond":
    case "oval":
    case "square":
    case "coffin":
    case "stiletto":
      return value;
    default:
      return "almond";
  }
}

function nailLength(value: unknown): NailLength {
  switch (value) {
    case "short":
    case "medium":
    case "long":
      return value;
    default:
      return "medium";
  }
}

function nailFinish(value: unknown): NailFinish {
  switch (value) {
    case "matte":
    case "chrome":
    case "glitter":
    case "jelly":
      return value;
    default:
      return "glossy";
  }
}

function finger(value: unknown): Finger {
  switch (value) {
    case "pinky":
    case "ring":
    case "middle":
    case "index":
    case "thumb":
      return value;
    default:
      return "thumb";
  }
}

function qualityMode(value: unknown): AiQualityMode {
  switch (value) {
    case "fast":
    case "quality":
      return value;
    default:
      return "balanced";
  }
}

function colorArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const colors = value.filter(
    (item): item is string => typeof item === "string" && HEX_COLOR.test(item),
  );
  return [...new Set(colors)].slice(0, 8);
}

function referenceImage(value: unknown): string | undefined {
  return typeof value === "string"
    && value.length <= MAX_REFERENCE_DATA_URI_LENGTH
    && REFERENCE_DATA_URI.test(value)
    ? value
    : undefined;
}

export function parseAiRequest(value: unknown): ParsedAiRequest | null {
  if (!isRecord(value) || typeof value.prompt !== "string") return null;
  const prompt = value.prompt.trim().slice(0, 1800);
  if (!prompt) return null;
  const parsedReference = referenceImage(value.referenceImage);
  if (value.referenceImage !== undefined && !parsedReference) return null;

  return {
    baseColor: typeof value.baseColor === "string" && HEX_COLOR.test(value.baseColor)
      ? value.baseColor
      : DEFAULT_BASE_COLOR,
    forceDiffusion: value.forceDiffusion === true,
    finish: nailFinish(value.finish),
    length: nailLength(value.length),
    prompt,
    qualityMode: qualityMode(value.qualityMode),
    referenceImage: parsedReference,
    referencePalette: colorArray(value.referencePalette),
    selectedFinger: finger(value.selectedFinger),
    shape: nailShape(value.shape),
  };
}
