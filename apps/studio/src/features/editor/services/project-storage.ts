import {
  NAIL_DEFINITIONS,
  createInitialProject,
} from "../domain/editor-data";
import type {
  EditorProject,
  Nail,
  NailFinish,
  NailId,
  NailLayer,
  NailLayerKind,
  NailLength,
  NailShape,
} from "../domain/types";

export const PROJECT_STORAGE_KEY = "nuvii-studio-project";
export const RECENT_ASSETS_STORAGE_KEY = "nuvii-studio-recent-assets";

const SHAPES = new Set<NailShape>(["almond", "oval", "square", "coffin", "stiletto"]);
const LENGTHS = new Set<NailLength>(["short", "medium", "long"]);
const FINISHES = new Set<NailFinish>(["glossy", "matte", "chrome", "glitter", "jelly"]);
const LAYER_KINDS = new Set<NailLayerKind>([
  "design",
  "3d",
  "charms",
  "chrome",
  "generated",
  "unknown",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, numberValue(value, fallback)));
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function validColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function enumValue<T extends string>(value: unknown, values: Set<T>, fallback: T): T {
  return typeof value === "string" && values.has(value as T) ? (value as T) : fallback;
}

function parseLayer(value: unknown, index: number): NailLayer | null {
  if (!isRecord(value)) return null;
  const metallic = value.metallic === "gold" || value.metallic === "silver"
    ? value.metallic
    : undefined;

  const legacyScale = boundedNumber(value.scale, 34, 8, 100);

  return {
    id: stringValue(value.id, `migrated-layer-${index}`),
    assetId: stringValue(value.assetId, "unknown-asset"),
    name: stringValue(value.name, "Design layer"),
    kind: enumValue(value.kind, LAYER_KINDS, "unknown"),
    color: validColor(value.color, "#ffffff"),
    x: boundedNumber(value.x, 50, 0, 100),
    y: boundedNumber(value.y, 90, 0, 180),
    width: boundedNumber(value.width, legacyScale, 8, 100),
    height: boundedNumber(value.height, legacyScale, 8, 180),
    rotation: boundedNumber(value.rotation, 0, -180, 180),
    opacity: boundedNumber(value.opacity, 1, 0, 1),
    imageData: typeof value.imageData === "string" ? value.imageData : undefined,
    tintable: booleanValue(value.tintable),
    metallic,
  };
}

function parseNail(
  value: unknown,
  fallback: Nail,
  legacyShape: NailShape,
  legacyLength: NailLength,
): Nail {
  if (!isRecord(value)) {
    return { ...fallback, shape: legacyShape, length: legacyLength };
  }
  const layers = Array.isArray(value.layers)
    ? value.layers
        .map(parseLayer)
        .filter((layer): layer is NailLayer => layer !== null)
    : [];

  return {
    ...fallback,
    baseColor: validColor(value.baseColor, fallback.baseColor),
    shape: enumValue(value.shape, SHAPES, legacyShape),
    length: enumValue(value.length, LENGTHS, legacyLength),
    finish: enumValue(value.finish, FINISHES, fallback.finish),
    layers,
  };
}

export function parseStoredProject(raw: string): EditorProject | null {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const storedNails = value.nails;
  if (!isRecord(storedNails)) return null;

  const fallback = createInitialProject();
  const legacyShape = enumValue(value.shape, SHAPES, "almond");
  const legacyLength = enumValue(value.length, LENGTHS, "long");
  const nails = Object.fromEntries(
    NAIL_DEFINITIONS.map((definition) => [
      definition.id,
      parseNail(
        storedNails[definition.id],
        fallback.nails[definition.id],
        legacyShape,
        legacyLength,
      ),
    ]),
  ) as Record<NailId, Nail>;

  return {
    schemaVersion: 3,
    name: stringValue(value.name ?? value.projectName, fallback.name),
    collectionName: stringValue(value.collectionName, fallback.collectionName),
    nails,
  };
}

export function serializeProject(project: EditorProject): string {
  return JSON.stringify({
    ...project,
    version: 3,
    savedAt: new Date().toISOString(),
  });
}

export function readStoredProject(storage: Storage): EditorProject | null {
  const raw = storage.getItem(PROJECT_STORAGE_KEY);
  return raw ? parseStoredProject(raw) : null;
}

export function writeStoredProject(storage: Storage, project: EditorProject): void {
  storage.setItem(PROJECT_STORAGE_KEY, serializeProject(project));
}

export function parseRecentAssetIds(raw: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((assetId): assetId is string => typeof assetId === "string")),
  ).slice(0, 8);
}

export function readRecentAssetIds(storage: Storage): string[] {
  const raw = storage.getItem(RECENT_ASSETS_STORAGE_KEY);
  return raw ? parseRecentAssetIds(raw) : [];
}

export function writeRecentAssetIds(storage: Storage, assetIds: readonly string[]): void {
  storage.setItem(RECENT_ASSETS_STORAGE_KEY, JSON.stringify(assetIds.slice(0, 8)));
}
