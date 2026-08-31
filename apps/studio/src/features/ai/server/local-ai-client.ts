const LOCAL_AI_BASE_URL = (
  process.env.NUVII_AI_SERVICE_URL
  || process.env.NUVII_AI_INTERNAL_URL
  || "http://127.0.0.1:8000"
).replace(/\/$/, "");

type LocalAiPath = "/generate" | "/generate-candidates" | "/health";

export interface InferenceCandidate {
  checkpoint?: string;
  dataURI: string;
  index: number;
  loraScale?: number;
  seed?: number;
}

export class LocalAiUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LocalAiUnavailableError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value)
      ? value
      : { error: "The AI service returned an unreadable response." };
  } catch {
    return { error: text };
  }
}

export async function requestLocalAi(
  path: LocalAiPath,
  options: { body?: unknown; timeoutMs: number },
) {
  let response: Response;
  try {
    response = await fetch(`${LOCAL_AI_BASE_URL}${path}`, {
      method: options.body === undefined ? "GET" : "POST",
      headers: options.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    throw new LocalAiUnavailableError(
      "The local AI service could not be reached.",
      { cause: error },
    );
  }

  return {
    payload: parsePayload(await response.text()),
    response,
  };
}

export function payloadMessage(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  return undefined;
}

export function parseInferenceCandidates(value: unknown): InferenceCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (
      !isRecord(candidate)
      || typeof candidate.dataURI !== "string"
      || !candidate.dataURI.startsWith("data:image/")
      || typeof candidate.index !== "number"
      || !Number.isInteger(candidate.index)
    ) return [];

    return [{
      checkpoint: typeof candidate.checkpoint === "string"
        ? candidate.checkpoint
        : undefined,
      dataURI: candidate.dataURI,
      index: candidate.index,
      loraScale: typeof candidate.loraScale === "number"
        ? candidate.loraScale
        : undefined,
      seed: typeof candidate.seed === "number" ? candidate.seed : undefined,
    }];
  });
}
