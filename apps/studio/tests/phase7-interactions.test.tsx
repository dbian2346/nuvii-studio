import assert from "node:assert/strict";
import test from "node:test";
import {
  AiRequestError,
  localAiServiceIsReady,
  requestEditableSet,
  requestSmartGeneration,
} from "../src/features/ai/services/ai-client";
import { ASSET_DEFINITIONS, createLayerFromAsset } from "../src/features/editor/domain/asset-data";
import { createInitialEditorState } from "../src/features/editor/domain/editor-reducer";
import { createPastedLayer } from "../src/features/editor/domain/layer-clipboard";

test("pasting creates an offset editable copy without mutating the copied layer", () => {
  const source = {
    ...createLayerFromAsset(ASSET_DEFINITIONS[0], "copied-layer"),
    x: 90,
    y: 168,
  };
  const pasted = createPastedLayer(source, "pasted-layer");

  assert.equal(source.id, "copied-layer");
  assert.equal(source.name, ASSET_DEFINITIONS[0].name);
  assert.equal(pasted.id, "pasted-layer");
  assert.equal(pasted.name, `${source.name} copy`);
  assert.equal(pasted.x, 92);
  assert.equal(pasted.y, 170);
  assert.equal(pasted.assetId, source.assetId);
});

test("AI Retry readiness requires a healthy service with configured LoRA", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => new Response(JSON.stringify({
    localAI: {
      loraConfigured: true,
      ok: true,
      status: "ok",
    },
  }), { headers: { "Content-Type": "application/json" }, status: 200 });
  assert.equal(await localAiServiceIsReady(), true);

  globalThis.fetch = async () => new Response(JSON.stringify({
    localAI: {
      loraConfigured: false,
      ok: true,
      status: "ok",
    },
  }), { headers: { "Content-Type": "application/json" }, status: 200 });
  assert.equal(await localAiServiceIsReady(), false);
});

test("malformed AI plans become actionable errors and never expose vague fetch text", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: "Failed to fetch", spec: "not-a-plan" }),
    { headers: { "Content-Type": "application/json" }, status: 200 },
  );
  const state = createInitialEditorState();

  await assert.rejects(
    requestEditableSet({
      nail: state.project.nails[state.selectedNailId],
      prompt: "Lavender aura",
    }),
    (error: unknown) => {
      assert.ok(error instanceof AiRequestError);
      assert.match(error.message, /unreadable design plan/i);
      assert.match(error.message, /current design was not changed/i);
      assert.match(error.message, /retry/i);
      assert.doesNotMatch(error.message, /failed to fetch/i);
      return true;
    },
  );
});

test("an unavailable local inference service explains the recovery path", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: "Failed to fetch" }),
    { headers: { "Content-Type": "application/json" }, status: 503 },
  );
  const state = createInitialEditorState();

  await assert.rejects(
    requestSmartGeneration({
      nail: state.project.nails[state.selectedNailId],
      prompt: "Photorealistic moonlight",
    }, "fast"),
    (error: unknown) => {
      assert.ok(error instanceof AiRequestError);
      assert.match(error.message, /local AI design service isn't running/i);
      assert.match(error.message, /current design was not changed/i);
      assert.match(error.message, /start the local inference service/i);
      assert.doesNotMatch(error.message, /failed to fetch/i);
      return true;
    },
  );
});
