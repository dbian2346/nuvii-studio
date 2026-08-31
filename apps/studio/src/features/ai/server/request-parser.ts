import type {
  Finger,
  NailFinish,
  NailLength,
  NailShape,
} from "@/features/editor/domain/types";
import type { AiQualityMode } from "../domain/types";

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

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

export function parseAiRequest(value: unknown): ParsedAiRequest | null {
  if (!isRecord(value) || typeof value.prompt !== "string") return null;
  const prompt = value.prompt.trim().slice(0, 1800);
  if (!prompt) return null;

  return {
    baseColor: typeof value.baseColor === "string" ? value.baseColor : "#f7dce5",
    forceDiffusion: value.forceDiffusion === true,
    finish: nailFinish(value.finish),
    length: nailLength(value.length),
    prompt,
    qualityMode: qualityMode(value.qualityMode),
    referenceImage: typeof value.referenceImage === "string"
      ? value.referenceImage
      : undefined,
    referencePalette: stringArray(value.referencePalette),
    selectedFinger: finger(value.selectedFinger),
    shape: nailShape(value.shape),
  };
}
