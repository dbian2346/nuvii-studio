import type { Nail } from "@/features/editor/domain/types";
import { isNailSetSpec } from "@/lib/nuvii-ai";
import type {
  AiCandidate,
  AiInterpretationResult,
  AiQualityMode,
  AiSmartResult,
} from "../domain/types";

export interface AiRequestInput {
  nail: Nail;
  prompt: string;
  referenceImage?: string;
}

export class AiRequestError extends Error {
  constructor(
    message: string,
    readonly kind: "interpretation" | "service" | "generation",
  ) {
    super(message);
    this.name = "AiRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function responsePayload(response: Response): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await response.json() as unknown;
  } catch {
    return {};
  }
  return isRecord(value) ? value : {};
}

function serverMessage(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.error === "string") return payload.error;
  if (typeof payload.detail === "string") return payload.detail;
  return undefined;
}

function usefulServerMessage(payload: Record<string, unknown>): string | undefined {
  const message = serverMessage(payload)?.trim();
  if (!message || /failed to fetch|unknown (error|connection)/i.test(message)) return undefined;
  return message;
}

function requestBody(input: AiRequestInput) {
  return {
    prompt: input.prompt,
    shape: input.nail.shape,
    length: input.nail.length,
    baseColor: input.nail.baseColor,
    finish: input.nail.finish,
    selectedFinger: input.nail.finger,
    referenceImage: input.referenceImage,
  };
}

export async function localAiServiceIsReady(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch("/api/ai/status", {
      cache: "no-store",
      signal,
    });
    if (!response.ok) return false;
    const payload = await responsePayload(response);
    if (!isRecord(payload.localAI)) return false;
    return payload.localAI.ok === true
      && payload.localAI.status === "ok"
      && payload.localAI.loraConfigured === true;
  } catch {
    return false;
  }
}

export async function requestEditableSet(
  input: AiRequestInput,
  signal?: AbortSignal,
): Promise<AiInterpretationResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody(input)),
      signal,
    });
  } catch {
    throw new AiRequestError(
      "Nuvii's design planner is unavailable. Your current design was not changed. Check the studio server, then choose Retry.",
      "interpretation",
    );
  }
  const payload = await responsePayload(response);
  if (!response.ok) {
    const detail = usefulServerMessage(payload);
    throw new AiRequestError(
      detail
        ? `${detail} Your current design was not changed. Retry, or rephrase the brief with specific colours and artwork.`
        : "Nuvii couldn't interpret this design brief. Your current design was not changed. Retry, or rephrase the brief with specific colours and artwork.",
      "interpretation",
    );
  }
  if (!isNailSetSpec(payload.spec)) {
    throw new AiRequestError(
      "Nuvii returned an unreadable design plan. Your current design was not changed. Choose Retry, or rephrase the brief.",
      "interpretation",
    );
  }
  return {
    source: payload.source === "openai" ? "openai" : "local",
    spec: payload.spec,
    warning: typeof payload.warning === "string" ? payload.warning : undefined,
  };
}

function parseCandidates(value: unknown): AiCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.dataURI !== "string" || typeof candidate.index !== "number") {
      return [];
    }
    return [{
      checkpoint: typeof candidate.checkpoint === "string" ? candidate.checkpoint : undefined,
      dataURI: candidate.dataURI,
      index: candidate.index,
      loraScale: typeof candidate.loraScale === "number" ? candidate.loraScale : undefined,
      qualityScore: typeof candidate.qualityScore === "number" ? candidate.qualityScore : null,
      recommended: candidate.recommended === true,
      seed: typeof candidate.seed === "number" ? candidate.seed : undefined,
    }];
  });
}

export async function requestSmartGeneration(
  input: AiRequestInput,
  qualityMode: AiQualityMode,
  signal?: AbortSignal,
): Promise<AiSmartResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/smart-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody(input), qualityMode }),
      signal,
    });
  } catch {
    throw new AiRequestError(
      "Nuvii's AI endpoint is unavailable. Your current design was not changed. Check the studio server, then choose Retry.",
      "service",
    );
  }
  const payload = await responsePayload(response);
  if (!response.ok) {
    const detail = usefulServerMessage(payload) ?? "";
    const serviceUnavailable = response.status === 503 || /unreachable|not running|connection/i.test(detail);
    throw new AiRequestError(
      serviceUnavailable
        ? "The local AI design service isn't running. Your current design was not changed. Start the local inference service, then choose Retry."
        : "Nuvii couldn't generate artwork. Your current design was not changed. Choose Retry, or use Build Editable Set instead.",
      serviceUnavailable ? "service" : "generation",
    );
  }
  if (!isNailSetSpec(payload.spec)) {
    throw new AiRequestError(
      "Nuvii returned an unreadable generation plan. Your current design was not changed. Choose Retry, or use Build Editable Set instead.",
      "generation",
    );
  }
  const mode = payload.mode;
  if (mode !== "library" && mode !== "hybrid" && mode !== "generative") {
    throw new AiRequestError(
      "Nuvii returned an incomplete design plan. Your current design was not changed. Choose Retry, or use Build Editable Set instead.",
      "generation",
    );
  }
  return {
    candidates: parseCandidates(payload.candidates),
    interpretationSource: payload.interpretationSource === "openai" ? "openai" : "local",
    message: typeof payload.message === "string" ? payload.message : "Nuvii prepared the design.",
    mode,
    spec: payload.spec,
    warning: typeof payload.warning === "string" ? payload.warning : undefined,
  };
}
