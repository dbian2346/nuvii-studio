import type {
  EditorProject,
  Finger,
  Hand,
  Nail,
  NailFinish,
  NailId,
  NailLength,
  NailShape,
} from "./types";

export interface NailDefinition {
  id: NailId;
  hand: Hand;
  finger: Finger;
  label: string;
}

export const RIGHT_HAND: readonly NailDefinition[] = [
  { id: "right-pinky", hand: "right", finger: "pinky", label: "Pinky" },
  { id: "right-index", hand: "right", finger: "index", label: "Index Finger" },
  { id: "right-middle", hand: "right", finger: "middle", label: "Middle Finger" },
  { id: "right-ring", hand: "right", finger: "ring", label: "Ring Finger" },
  { id: "right-thumb", hand: "right", finger: "thumb", label: "Thumb" },
] as const;

export const LEFT_HAND: readonly NailDefinition[] = [
  { id: "left-pinky", hand: "left", finger: "pinky", label: "Pinky" },
  { id: "left-ring", hand: "left", finger: "ring", label: "Ring Finger" },
  { id: "left-middle", hand: "left", finger: "middle", label: "Middle Finger" },
  { id: "left-index", hand: "left", finger: "index", label: "Index Finger" },
  { id: "left-thumb", hand: "left", finger: "thumb", label: "Thumb" },
] as const;

export const NAIL_DEFINITIONS = [...RIGHT_HAND, ...LEFT_HAND] as const;
export const NAIL_IDS = NAIL_DEFINITIONS.map((nail) => nail.id);

export const SHAPE_PATHS: Readonly<Record<NailShape, string>> = {
  almond:
    "M50 3 C29 3 16 17 15 40 L21 148 C23 168 33 178 50 180 C67 178 77 168 79 148 L85 40 C84 17 71 3 50 3 Z",
  oval:
    "M50 3 C28 3 15 17 14 40 L17 146 C18 167 30 179 50 180 C70 179 82 167 83 146 L86 40 C85 17 72 3 50 3 Z",
  square:
    "M50 4 C31 4 20 13 17 34 L21 164 Q22 176 33 178 L67 178 Q78 176 79 164 L83 34 C80 13 69 4 50 4 Z",
  coffin:
    "M50 4 C31 4 20 13 17 34 L29 164 Q30 176 39 178 L61 178 Q70 176 71 164 L83 34 C80 13 69 4 50 4 Z",
  stiletto:
    "M50 4 C31 4 20 13 17 34 C13 70 20 113 34 151 C40 168 47 178 50 180 C53 178 60 168 66 151 C80 113 87 70 83 34 C80 13 69 4 50 4 Z",
};

export const SHAPE_OPTIONS: readonly { value: NailShape; label: string }[] = [
  { value: "almond", label: "Almond" },
  { value: "oval", label: "Oval" },
  { value: "square", label: "Square" },
  { value: "coffin", label: "Coffin" },
  { value: "stiletto", label: "Stiletto" },
] as const;

export const LENGTH_OPTIONS: readonly { value: NailLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
] as const;

export const FINISH_OPTIONS: readonly { value: NailFinish; label: string }[] = [
  { value: "glossy", label: "Glossy" },
  { value: "matte", label: "Matte" },
  { value: "chrome", label: "Chrome" },
  { value: "glitter", label: "Glitter" },
  { value: "jelly", label: "Jelly" },
] as const;

export const COLOR_OPTIONS = [
  { name: "Blush pink", value: "#f4c3d3" },
  { name: "Soft lavender", value: "#e2e2ff" },
  { name: "Soft sage", value: "#d1e0d6" },
  { name: "Warm cream", value: "#f8f2e7" },
] as const;

export const LENGTH_HEIGHTS: Readonly<Record<NailLength, number>> = {
  short: 178,
  medium: 210,
  long: 241,
};

function createNail(definition: NailDefinition): Nail {
  const selectedByDefault = definition.id === "right-index";
  return {
    ...definition,
    baseColor: selectedByDefault ? "#f4c3d3" : "#f3e7e0",
    shape: "almond",
    length: "long",
    finish: "glossy",
    layers: [],
  };
}

export function createInitialProject(): EditorProject {
  return {
    schemaVersion: 3,
    name: "Gradient Base Set",
    collectionName: "Fall Collection",
    nails: Object.fromEntries(
      NAIL_DEFINITIONS.map((definition) => [definition.id, createNail(definition)]),
    ) as Record<NailId, Nail>,
  };
}
