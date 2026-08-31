import { NextRequest, NextResponse } from "next/server";
import {
  LocalAiUnavailableError,
  parseInferenceCandidates,
  payloadMessage,
  requestLocalAi,
} from "@/features/ai/server/local-ai-client";
import { parseAiRequest } from "@/features/ai/server/request-parser";
import {
  interpretNailPrompt,
  judgeCandidates,
  openAIConfigured,
} from "@/features/ai/server/openai-nuvii";
import type { AiQualityMode } from "@/features/ai/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

function candidateCount(mode: AiQualityMode) {
  if (mode === "fast") return 1;
  if (mode === "quality") return 3;
  return 2;
}

export async function POST(request: NextRequest) {
  try {
    const value: unknown = await request.json();
    const input = parseAiRequest(value);
    if (!input) {
      return NextResponse.json({ error: "Describe the nail design first." }, { status: 400 });
    }

    const interpreted = await interpretNailPrompt({
      baseColor: input.baseColor,
      finish: input.finish,
      length: input.length,
      prompt: input.prompt,
      referenceImage: input.referenceImage,
      referencePalette: input.referencePalette,
      shape: input.shape,
    });

    const spec = interpreted.spec;
    const fingerPlan = spec.nails.find((plan) => plan.finger === input.selectedFinger)
      ?? spec.nails[0];

    // If the request can be represented exactly with the editor library, don't ask
    // diffusion to approximate it. This makes known concepts deterministic/editable.
    if (spec.strategy === "library" && !input.forceDiffusion) {
      return NextResponse.json({
        mode: "library",
        spec,
        interpretationSource: interpreted.source,
        warning: interpreted.warning,
        openaiConfigured: openAIConfigured(),
        message: "Built from editable Nuvii assets for exact prompt adherence.",
        candidates: [],
      });
    }

    const count = candidateCount(input.qualityMode);
    const { payload, response } = await requestLocalAi("/generate-candidates", {
      body: {
        prompt: spec.diffusionPrompt,
        negativePrompt: spec.negativePrompt,
        shape: spec.shape,
        length: spec.length,
        baseColor: fingerPlan.baseColor,
        finish: fingerPlan.finish,
        count,
        steps: input.qualityMode === "quality" ? 34 : 28,
      },
      timeoutMs: 540_000,
    });
    const inferenceCandidates = parseInferenceCandidates(payload.candidates);
    if (!response.ok || !inferenceCandidates.length) {
      const message = payloadMessage(payload)
        ?? "The Nuvii image model returned no candidates.";
      if (response.status === 503) throw new LocalAiUnavailableError(message);
      throw new Error(message);
    }

    const judged = await judgeCandidates({
      spec,
      selectedFinger: input.selectedFinger,
      candidates: inferenceCandidates,
    });
    const selected = inferenceCandidates.find(
      (candidate) => candidate.index === judged.judge.selectedIndex,
    ) ?? inferenceCandidates[0];
    const selectedScore = judged.judge.scores.find((score) => score.index === selected.index);
    const candidates = inferenceCandidates.map((candidate) => ({
      ...candidate,
      qualityScore: judged.judge.scores.find((score) => score.index === candidate.index)?.total ?? null,
      recommended: candidate.index === selected.index,
    }));

    return NextResponse.json({
      mode: spec.strategy,
      spec,
      dataURI: selected.dataURI,
      seed: selected.seed,
      checkpoint: selected.checkpoint,
      loraScale: selected.loraScale,
      candidatesGenerated: inferenceCandidates.length,
      qualityScore: selectedScore?.total ?? null,
      candidates,
      judge: judged.judge,
      judgeSource: judged.source,
      interpretationSource: interpreted.source,
      warning: interpreted.warning,
      openaiConfigured: openAIConfigured(),
      message: judged.source === "openai"
        ? `OpenAI selected candidate ${selected.index + 1} of ${inferenceCandidates.length} for prompt adherence.`
        : `Generated ${inferenceCandidates.length} diversified Nuvii candidate${inferenceCandidates.length === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Smart generation failed.";
    const unavailable = error instanceof LocalAiUnavailableError;
    return NextResponse.json(
      {
        error: unavailable
          ? "The AI design service isn't running. Your current design was not changed."
          : "Nuvii's nail model couldn't complete this design. Your current design was not changed.",
        detail,
      },
      { status: unavailable ? 503 : 502 },
    );
  }
}
