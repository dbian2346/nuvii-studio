import { NextRequest, NextResponse } from "next/server";
import {
  LocalAiUnavailableError,
  requestLocalAi,
} from "@/features/ai/server/local-ai-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid generation request." }, { status: 400 });
  }

  try {
    const { payload, response } = await requestLocalAi("/generate", {
      body,
      timeoutMs: 300_000,
    });

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown connection error";
    return NextResponse.json(
      {
        error:
          "Nuvii AI is not reachable yet. Keep the Terminal running and wait for the AI service to say it is ready, then try Generate again.",
        detail,
      },
      { status: error instanceof LocalAiUnavailableError ? 503 : 502 },
    );
  }
}
