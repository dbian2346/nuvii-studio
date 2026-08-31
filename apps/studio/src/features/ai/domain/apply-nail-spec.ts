import { ASSET_BY_ID, createLayerFromAsset } from "@/features/editor/domain/asset-data";
import type {
  EditorProject,
  Nail,
  NailId,
  NailLayer,
} from "@/features/editor/domain/types";
import type { NailSetSpec } from "@/lib/nuvii-ai";
import type { AiAppliedSummary } from "./types";

export const GENERATED_ARTWORK_ASSET_ID = "ai-generated-artwork";

interface ApplyNailSpecOptions {
  createId: () => string;
  generatedArtwork?: {
    dataURI: string;
    nailId: NailId;
  };
}

export interface AppliedNailSpec {
  project: EditorProject;
  summary: AiAppliedSummary;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createNativeLayers(
  spec: NailSetSpec,
  finger: Nail["finger"],
  createId: () => string,
): NailLayer[] {
  const plan = spec.nails.find((candidate) => candidate.finger === finger);
  if (!plan) return [];
  return plan.elements.flatMap((element) => {
    const asset = ASSET_BY_ID.get(element.assetId);
    if (!asset) return [];
    const layer = createLayerFromAsset(asset, createId());
    const scaleFactor = element.scale / 60;
    return [{
      ...layer,
      color: element.color,
      height: clamp(asset.defaultHeight * scaleFactor, 8, 180),
      opacity: clamp(element.opacity, 0, 1),
      rotation: clamp(element.rotation, -180, 180),
      width: clamp(asset.defaultWidth * scaleFactor, 8, 100),
      x: clamp(element.x, 0, 100),
      y: clamp(element.y, 0, 180),
    }];
  });
}

function createGeneratedLayer(dataURI: string, createId: () => string): NailLayer {
  return {
    id: createId(),
    assetId: GENERATED_ARTWORK_ASSET_ID,
    name: "Generated artwork",
    kind: "generated",
    color: "#ffffff",
    x: 50,
    y: 90,
    width: 100,
    height: 180,
    rotation: 0,
    opacity: 1,
    imageData: dataURI,
    tintable: false,
  };
}

export function applyNailSpec(
  current: EditorProject,
  spec: NailSetSpec,
  options: ApplyNailSpecOptions,
): AppliedNailSpec {
  let nativeLayerCount = 0;
  let generatedLayerCount = 0;
  const nails = Object.fromEntries(
    Object.entries(current.nails).map(([id, nail]) => {
      const plan = spec.nails.find((candidate) => candidate.finger === nail.finger);
      const nativeLayers = createNativeLayers(spec, nail.finger, options.createId);
      nativeLayerCount += nativeLayers.length;
      const generatedLayers =
        options.generatedArtwork?.nailId === id
          ? [createGeneratedLayer(options.generatedArtwork.dataURI, options.createId)]
          : [];
      generatedLayerCount += generatedLayers.length;
      return [id, {
        ...nail,
        baseColor: plan?.baseColor ?? nail.baseColor,
        finish: plan?.finish ?? spec.finish,
        length: spec.length,
        shape: spec.shape,
        layers: [...generatedLayers, ...nativeLayers],
      }];
    }),
  ) as EditorProject["nails"];

  return {
    project: { ...current, nails },
    summary: { generatedLayerCount, nativeLayerCount },
  };
}
