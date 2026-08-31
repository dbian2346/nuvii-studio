import type { NailLayer, NailLayerPatch } from "./types";

export const PRECISION_ZOOM_MIN = 75;
export const PRECISION_ZOOM_MAX = 180;
export const PRECISION_ZOOM_STEP = 5;
export const PRECISION_NUDGE_STEP = 1;

export function clampPrecisionZoom(value: number) {
  return Math.min(PRECISION_ZOOM_MAX, Math.max(PRECISION_ZOOM_MIN, value));
}

export function createNudgePatch(
  layer: NailLayer,
  direction: "up" | "right" | "down" | "left",
  amount = PRECISION_NUDGE_STEP,
): NailLayerPatch {
  if (direction === "left") return { x: Math.max(0, layer.x - amount) };
  if (direction === "right") return { x: Math.min(100, layer.x + amount) };
  if (direction === "up") return { y: Math.max(0, layer.y - amount) };
  return { y: Math.min(180, layer.y + amount) };
}
