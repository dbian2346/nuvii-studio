import {
  CandidateJudge,
  NailFinish,
  NailSetSpec,
  NailShape,
  NailLength,
  NUVII_ASSET_DESCRIPTION,
  NUVII_ASSET_IDS,
  fallbackNailSpec,
  isNailSetSpec,
  normalizeNailSpec,
} from "@/lib/nuvii-ai";

const OPENAI_URL = "https://api.openai.com/v1/responses";

type OpenAIInputContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "high" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseError(payload: unknown): string | undefined {
  if (!isRecord(payload) || !isRecord(payload.error)) return undefined;
  return typeof payload.error.message === "string" ? payload.error.message : undefined;
}

function isCandidateJudge(value: unknown): value is CandidateJudge {
  if (
    !isRecord(value)
    || !Number.isInteger(value.selectedIndex)
    || typeof value.selectedReason !== "string"
    || !Array.isArray(value.scores)
  ) return false;

  return value.scores.every((score) =>
    isRecord(score)
    && Number.isInteger(score.index)
    && typeof score.total === "number"
    && typeof score.promptAdherence === "number"
    && typeof score.nailIsolation === "number"
    && typeof score.shapeMatch === "number"
    && typeof score.detailPresence === "number"
    && typeof score.aesthetics === "number"
    && Array.isArray(score.failureReasons)
    && score.failureReasons.every((reason) => typeof reason === "string"),
  );
}

export function openAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function openAIModel() {
  return process.env.NUVII_OPENAI_MODEL?.trim() || "gpt-5.4-mini";
}

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const pieces: string[] = [];
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!isRecord(item)) continue;
    const contentItems = Array.isArray(item.content) ? item.content : [];
    for (const content of contentItems) {
      if (isRecord(content) && content.type === "output_text" && typeof content.text === "string") {
        pieces.push(content.text);
      }
    }
  }
  return pieces.join("\n").trim();
}

const elementSchema = {
  type: "object",
  properties: {
    assetId: { type: "string", enum: NUVII_ASSET_IDS },
    color: { type: "string" },
    x: { type: "number"},
    y: { type: "number"},
    scale: { type: "number"},
    rotation: { type: "number"},
    opacity: { type: "number"},
  },
  required: ["assetId", "color", "x", "y", "scale", "rotation", "opacity"],
  additionalProperties: false,
};

const nailPlanSchema = {
  type: "object",
  properties: {
    finger: { type: "string", enum: ["pinky", "ring", "middle", "index", "thumb"] },
    baseColor: { type: "string" },
    finish: { type: "string", enum: ["glossy", "matte", "chrome", "glitter", "jelly"] },
    elements: { type: "array", items: elementSchema},
  },
  required: ["finger", "baseColor", "finish", "elements"],
  additionalProperties: false,
};

const nailSpecSchema = {
  type: "object",
  properties: {
    shape: { type: "string", enum: ["almond", "oval", "square", "coffin", "stiletto"] },
    length: { type: "string", enum: ["short", "medium", "long"] },
    palette: { type: "array", items: { type: "string" }},
    finish: { type: "string", enum: ["glossy", "matte", "chrome", "glitter", "jelly"] },
    styleTags: { type: "array", items: { type: "string" }},
    strategy: { type: "string", enum: ["library", "hybrid", "generative"] },
    requiredConcepts: { type: "array", items: { type: "string" }},
    forbiddenConcepts: { type: "array", items: { type: "string" }},
    novelConcepts: { type: "array", items: { type: "string" }},
    diffusionPrompt: { type: "string"},
    negativePrompt: { type: "string"},
    designSummary: { type: "string"},
    nails: { type: "array", items: nailPlanSchema},
  },
  required: [
    "shape", "length", "palette", "finish", "styleTags", "strategy",
    "requiredConcepts", "forbiddenConcepts", "novelConcepts", "diffusionPrompt",
    "negativePrompt", "designSummary", "nails",
  ],
  additionalProperties: false,
};

export async function interpretNailPrompt(args: {
  prompt: string;
  shape: NailShape;
  length: NailLength;
  finish: NailFinish;
  baseColor: string;
  referenceImage?: string;
  referencePalette?: string[];
}): Promise<{ spec: NailSetSpec; source: "openai" | "local"; warning?: string }> {
  const fallback = fallbackNailSpec(args);
  if (!openAIConfigured()) {
    return { spec: fallback, source: "local", warning: "OpenAI controller is not configured; using Nuvii's deterministic parser." };
  }

  const content: OpenAIInputContent[] = [{
    type: "input_text",
    text: [
      `USER REQUEST: ${args.prompt}`,
      `CURRENT EDITOR SHAPE: ${args.shape}`,
      `CURRENT EDITOR LENGTH: ${args.length}`,
      `CURRENT BASE COLOR: ${args.baseColor}`,
      `CURRENT FINISH: ${args.finish}`,
      args.referencePalette?.length ? `REFERENCE PALETTE: ${args.referencePalette.join(", ")}` : "",
    ].filter(Boolean).join("\n"),
  }];
  if (args.referenceImage?.startsWith("data:image/")) {
    content.push({ type: "input_image", image_url: args.referenceImage, detail: "high" });
  }

  const instructions = `You are the Nuvii Studio nail-design controller. Convert a natural-language nail request into an exact editable five-finger plan and an optimized diffusion prompt.

PRIMARY GOAL: prompt adherence, not generic prettiness. Never silently replace requested art with a plain nude nail.

Use deterministic Nuvii assets whenever they can represent the requested concept. Set strategy=library when all important requested visual concepts are supported by the asset catalog. Use hybrid only when at least one important concept needs novel generative artwork. Use generative only when most of the design cannot be represented by the library.

For each finger, create a deliberate but cohesive variation. Include all five fingers exactly once. The same five-finger plan will be mirrored to both hands by the editor.

Asset catalog (assetId: meaning):
${NUVII_ASSET_DESCRIPTION}

Placement coordinates use x=0..100 left-to-right and y=0..180 cuticle-to-tip. French tips belong near y=145. Aura/ombre can be large background layers. Bows usually sit around y=35..70. Gems/pearls are usually small. Keep no more than 6 elements per nail.

The diffusionPrompt is only for novel artwork. Keep it under 55 words so CLIP retains every required concept. Put requested artwork before aesthetic language. Describe the requested base color, material, placement, and style, and state that every requested decoration must be clearly visible. The negativePrompt must include plain undecorated nail, missing requested decorations, hand, finger, multiple nails, text, and watermark unless the user explicitly requests text.

Do not output commentary outside the schema.`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: openAIModel(),
        store: false,
        input: [
          { role: "system", content: [{ type: "input_text", text: instructions }] },
          { role: "user", content },
        ],
        max_output_tokens: 5000,
        text: {
          format: {
            type: "json_schema",
            name: "nuvii_nail_set_spec",
            strict: true,
            schema: nailSpecSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    const payload = await response.json() as unknown;
    if (!response.ok) {
      throw new Error(responseError(payload) || `OpenAI returned HTTP ${response.status}`);
    }
    const text = extractOutputText(payload);
    if (!text) throw new Error("OpenAI returned no structured NailSpec.");
    const parsed: unknown = JSON.parse(text);
    if (!isNailSetSpec(parsed)) throw new Error("OpenAI returned an invalid NailSpec.");
    return { spec: normalizeNailSpec(parsed, fallback), source: "openai" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown OpenAI error";
    return { spec: fallback, source: "local", warning: `OpenAI controller fell back to local parsing: ${detail}` };
  }
}

const judgeSchema = {
  type: "object",
  properties: {
    selectedIndex: { type: "integer"},
    selectedReason: { type: "string"},
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer"},
          total: { type: "number"},
          promptAdherence: { type: "number"},
          nailIsolation: { type: "number"},
          shapeMatch: { type: "number"},
          detailPresence: { type: "number"},
          aesthetics: { type: "number"},
          failureReasons: { type: "array", items: { type: "string" }},
        },
        required: ["index", "total", "promptAdherence", "nailIsolation", "shapeMatch", "detailPresence", "aesthetics", "failureReasons"],
        additionalProperties: false,
      },
    },
  },
  required: ["selectedIndex", "selectedReason", "scores"],
  additionalProperties: false,
};

export async function judgeCandidates(args: {
  spec: NailSetSpec;
  selectedFinger: string;
  candidates: Array<{ dataURI: string; index: number; checkpoint?: string; loraScale?: number }>;
}): Promise<{ judge: CandidateJudge; source: "openai" | "local" }> {
  if (!openAIConfigured() || args.candidates.length <= 1) {
    return {
      source: "local",
      judge: {
        selectedIndex: args.candidates[0]?.index ?? 0,
        selectedReason: openAIConfigured() ? "Only one candidate was generated." : "OpenAI visual judging is not configured.",
        scores: args.candidates.map((candidate) => ({
          index: candidate.index,
          total: 0,
          promptAdherence: 0,
          nailIsolation: 0,
          shapeMatch: 0,
          detailPresence: 0,
          aesthetics: 0,
          failureReasons: [],
        })),
      },
    };
  }

  const content: OpenAIInputContent[] = [{
    type: "input_text",
    text: `Evaluate ${args.candidates.length} candidate nail images against this exact Nuvii NailSpec for the ${args.selectedFinger} finger:\n${JSON.stringify(args.spec)}\n\nCandidate images follow in index order. Penalize a plain nude/blank nail heavily whenever requested decorations are missing. Prompt adherence is the highest priority. Also require exactly one isolated press-on nail, the requested shape, and clearly visible required concepts. Select the highest-quality candidate that actually follows the design request.`,
  }];
  args.candidates.forEach((candidate) => {
    content.push({ type: "input_text", text: `Candidate ${candidate.index}` });
    content.push({ type: "input_image", image_url: candidate.dataURI, detail: "high" });
  });

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: openAIModel(),
        store: false,
        max_output_tokens: 2500,
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "nuvii_candidate_judge",
            strict: true,
            schema: judgeSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const payload = await response.json() as unknown;
    if (!response.ok) throw new Error(responseError(payload) || `OpenAI returned HTTP ${response.status}`);
    const text = extractOutputText(payload);
    if (!text) throw new Error("OpenAI returned no candidate evaluation.");
    const judge: unknown = JSON.parse(text);
    if (!isCandidateJudge(judge)) throw new Error("OpenAI returned an invalid candidate evaluation.");
    const validIndexes = new Set(args.candidates.map((candidate) => candidate.index));
    if (!validIndexes.has(judge.selectedIndex)) throw new Error("OpenAI selected an unavailable candidate.");
    if (judge.scores.some((score) => !validIndexes.has(score.index))) {
      throw new Error("OpenAI scored an unavailable candidate.");
    }
    return { judge, source: "openai" };
  } catch {
    return {
      source: "local",
      judge: {
        selectedIndex: args.candidates[0]?.index ?? 0,
        selectedReason: "Visual judge was unavailable; Nuvii used the first diversified candidate.",
        scores: args.candidates.map((candidate) => ({
          index: candidate.index,
          total: 0,
          promptAdherence: 0,
          nailIsolation: 0,
          shapeMatch: 0,
          detailPresence: 0,
          aesthetics: 0,
          failureReasons: [],
        })),
      },
    };
  }
}
