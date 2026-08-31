import type { NailSetSpec, RenderStrategy } from "@/lib/nuvii-ai";

export type AiQualityMode = "fast" | "balanced" | "quality";
export type AiRunKind = "editable" | "smart";

export interface AiCandidate {
  checkpoint?: string;
  dataURI: string;
  index: number;
  loraScale?: number;
  qualityScore: number | null;
  recommended: boolean;
  seed?: number;
}

export interface AiInterpretationResult {
  source: "local" | "openai";
  spec: NailSetSpec;
  warning?: string;
}

export interface AiSmartResult {
  candidates: AiCandidate[];
  interpretationSource: "local" | "openai";
  message: string;
  mode: RenderStrategy;
  spec: NailSetSpec;
  warning?: string;
}

export interface AiAppliedSummary {
  generatedLayerCount: number;
  nativeLayerCount: number;
}
