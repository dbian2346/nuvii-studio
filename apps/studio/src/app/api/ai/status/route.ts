import { NextResponse } from "next/server";
import {
  openAIConfigured,
  openAIModel,
} from "@/features/ai/server/openai-nuvii";
import { requestLocalAi } from "@/features/ai/server/local-ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let localAI: Record<string, unknown> = { ok: false };
  try {
    localAI = (await requestLocalAi("/health", { timeoutMs: 3_000 })).payload;
  } catch {
    localAI = { ok: false, error: "Local image service is not reachable." };
  }

  return NextResponse.json({
    openaiConfigured: openAIConfigured(),
    openaiModel: openAIModel(),
    localAI,
    controllerMode: openAIConfigured() ? "OpenAI structured controller + Nuvii LoRA" : "Local deterministic controller + Nuvii LoRA",
  });
}
