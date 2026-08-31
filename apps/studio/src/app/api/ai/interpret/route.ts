import { NextRequest, NextResponse } from "next/server";
import { interpretNailPrompt } from "@/features/ai/server/openai-nuvii";
import { parseAiRequest } from "@/features/ai/server/request-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const value: unknown = await request.json();
    const input = parseAiRequest(value);
    if (!input) {
      return NextResponse.json({ error: "Describe the nail design first." }, { status: 400 });
    }
    const result = await interpretNailPrompt({
      baseColor: input.baseColor,
      finish: input.finish,
      length: input.length,
      prompt: input.prompt,
      referenceImage: input.referenceImage,
      referencePalette: input.referencePalette,
      shape: input.shape,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not interpret the design." }, { status: 500 });
  }
}
