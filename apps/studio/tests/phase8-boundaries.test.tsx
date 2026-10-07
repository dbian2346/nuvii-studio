import assert from "node:assert/strict";
import test from "node:test";
import { parseInferenceCandidates } from "../src/features/ai/server/local-ai-client";
import { parseAiRequest } from "../src/features/ai/server/request-parser";

test("AI requests are normalized once at the server boundary", () => {
  const parsed = parseAiRequest({
    baseColor: "#d1e0d6",
    length: "long",
    prompt: "  Lavender aura with silver chrome  ",
    qualityMode: "quality",
    selectedFinger: "index",
    shape: "coffin",
  });

  assert.deepEqual(parsed, {
    baseColor: "#d1e0d6",
    finish: "glossy",
    forceDiffusion: false,
    length: "long",
    prompt: "Lavender aura with silver chrome",
    qualityMode: "quality",
    referenceImage: undefined,
    referencePalette: undefined,
    selectedFinger: "index",
    shape: "coffin",
  });
  assert.equal(parseAiRequest({ prompt: "   " }), null);
});

test("AI request parsing rejects unsafe references and normalizes colours", () => {
  assert.equal(parseAiRequest({
    prompt: "Use this reference",
    referenceImage: "data:image/svg+xml;base64,PHN2Zy8+",
  }), null);

  const parsed = parseAiRequest({
    baseColor: "red\"><script>",
    prompt: "Lavender French tips",
    referenceImage: "data:image/png;base64,AAAA",
    referencePalette: ["#f4c3d3", "not-a-colour", "#f4c3d3", "#D1E0D6"],
  });

  assert.equal(parsed?.baseColor, "#f7dce5");
  assert.equal(parsed?.referenceImage, "data:image/png;base64,AAAA");
  assert.deepEqual(parsed?.referencePalette, ["#f4c3d3", "#D1E0D6"]);
});

test("malformed inference candidates are rejected before judging or rendering", () => {
  const candidates = parseInferenceCandidates([
    {
      dataURI: "data:image/png;base64,AAAA",
      index: 0,
      seed: 42,
    },
    { dataURI: "https://example.com/not-local.png", index: 1 },
    { dataURI: "data:image/png;base64,BBBB", index: 1.5 },
    { index: 2 },
  ]);

  assert.deepEqual(candidates, [{
    checkpoint: undefined,
    dataURI: "data:image/png;base64,AAAA",
    index: 0,
    loraScale: undefined,
    seed: 42,
  }]);
});
