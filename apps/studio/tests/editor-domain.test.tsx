import assert from "node:assert/strict";
import test from "node:test";
import {
  ASSET_DEFINITIONS,
  ASSET_BY_ID,
  createLayerFromAsset,
} from "../src/features/editor/domain/asset-data";
import {
  GENERATED_ARTWORK_ASSET_ID,
  applyNailSpec,
} from "../src/features/ai/domain/apply-nail-spec";
import type { AssetSubcategory } from "../src/features/editor/domain/types";
import {
  createInitialEditorState,
  editorReducer,
} from "../src/features/editor/domain/editor-reducer";
import {
  clampPrecisionZoom,
  createNudgePatch,
  PRECISION_ZOOM_MAX,
  PRECISION_ZOOM_MIN,
} from "../src/features/editor/domain/precision";
import { createProjectSvg } from "../src/features/editor/services/export-project";
import {
  parseStoredProject,
  parseRecentAssetIds,
  serializeProject,
} from "../src/features/editor/services/project-storage";
import { fallbackNailSpec } from "../src/lib/nuvii-ai";

test("updates only the selected nail and records one history entry", () => {
  const initial = createInitialEditorState();
  const next = editorReducer(initial, {
    type: "update-selected-nail",
    patch: { baseColor: "#d1e0d6" },
  });

  assert.equal(next.project.nails["right-index"].baseColor, "#d1e0d6");
  assert.equal(
    next.project.nails["right-pinky"],
    initial.project.nails["right-pinky"],
    "unmodified nails retain referential identity",
  );
  assert.equal(next.past.length, 1);
  assert.equal(next.future.length, 0);
});

test("undo and redo restore the complete project snapshot", () => {
  const initial = createInitialEditorState();
  const changed = editorReducer(initial, {
    type: "update-selected-nail",
    patch: { shape: "square", length: "short" },
  });
  const undone = editorReducer(changed, { type: "undo" });
  const redone = editorReducer(undone, { type: "redo" });

  assert.equal(undone.project.nails["right-index"].shape, "almond");
  assert.equal(undone.project.nails["right-index"].length, "long");
  assert.equal(redone.project.nails["right-index"].shape, "square");
  assert.equal(redone.project.nails["right-index"].length, "short");
});

test("apply to all is one undoable domain command", () => {
  const initial = createInitialEditorState();
  const selectedChanged = editorReducer(initial, {
    type: "update-selected-nail",
    patch: { finish: "matte" },
  });
  const applied = editorReducer(selectedChanged, {
    type: "apply-selected-to-all",
    property: "finish",
  });

  assert.ok(Object.values(applied.project.nails).every((nail) => nail.finish === "matte"));
  assert.equal(applied.past.length, 2);

  const undone = editorReducer(applied, { type: "undo" });
  assert.equal(undone.project.nails["right-pinky"].finish, "glossy");
  assert.equal(undone.project.nails["right-index"].finish, "matte");
});

test("legacy version-one saves migrate global shape and length into every nail", () => {
  const legacy = JSON.stringify({
    version: 1,
    projectName: "Imported set",
    shape: "coffin",
    length: "medium",
    nails: {
      "right-index": {
        baseColor: "#abcdef",
        finish: "chrome",
        layers: [],
      },
    },
  });
  const project = parseStoredProject(legacy);

  assert.ok(project);
  assert.equal(project.name, "Imported set");
  assert.equal(project.nails["right-index"].baseColor, "#abcdef");
  assert.equal(project.nails["right-index"].finish, "chrome");
  assert.ok(Object.values(project.nails).every((nail) => nail.shape === "coffin"));
  assert.ok(Object.values(project.nails).every((nail) => nail.length === "medium"));
});

test("version-two serialization round-trips through the validator", () => {
  const project = createInitialEditorState().project;
  const parsed = parseStoredProject(serializeProject(project));

  assert.deepEqual(parsed, project);
});

test("PNG source SVG contains both hand rows and all ten nails", () => {
  const svg = createProjectSvg(createInitialEditorState().project);

  assert.match(svg, /NUVII STUDIO/);
  assert.match(svg, /Gradient Base Set/);
  assert.equal(svg.match(/<clipPath/g)?.length, 10);
});

test("asset catalogue covers every Phase 3 artwork family", () => {
  const subcategories = new Set(ASSET_DEFINITIONS.map((asset) => asset.subcategory));
  const expected: readonly AssetSubcategory[] = [
    "bows",
    "french-tips",
    "aura",
    "ombre",
    "florals",
    "swirls",
    "stars",
    "hearts",
    "animal-prints",
    "patterns",
    "gel-swirls",
    "flowers",
    "bubbles",
    "shells",
    "pearls",
    "rhinestones",
    "gems",
    "chains",
    "caviar-beads",
    "gold",
    "silver",
    "isolated-elements",
  ];

  assert.ok(expected.every((subcategory) => subcategories.has(subcategory)));
  assert.deepEqual(new Set(ASSET_DEFINITIONS.map((asset) => asset.category)), new Set([
    "design",
    "3d",
    "charms",
    "chrome",
  ]));
});

test("layer workflow is data-driven, ordered, and undoable", () => {
  const firstAsset = ASSET_DEFINITIONS[0];
  const secondAsset = ASSET_DEFINITIONS[1];
  let state = createInitialEditorState();
  state = editorReducer(state, {
    type: "add-layer",
    layer: createLayerFromAsset(firstAsset, "layer-one"),
  });
  state = editorReducer(state, {
    type: "add-layer",
    layer: createLayerFromAsset(secondAsset, "layer-two"),
  });
  assert.equal(state.activeTool, "layers", "new artwork opens its selected layer controls");
  state = editorReducer(state, {
    type: "update-layer",
    nailId: "right-index",
    layerId: "layer-one",
    patch: { x: 32, rotation: 28, opacity: 0.6 },
  });
  state = editorReducer(state, {
    type: "move-layer",
    nailId: "right-index",
    layerId: "layer-one",
    direction: "forward",
  });

  const layers = state.project.nails["right-index"].layers;
  assert.deepEqual(layers.map((layer) => layer.id), ["layer-two", "layer-one"]);
  assert.equal(layers[1].x, 32);
  assert.equal(layers[1].rotation, 28);
  assert.equal(layers[1].opacity, 0.6);

  const duplicated = editorReducer(state, {
    type: "duplicate-layer",
    nailId: "right-index",
    layerId: "layer-one",
    newLayerId: "layer-copy",
  });
  const deleted = editorReducer(duplicated, {
    type: "delete-layer",
    nailId: "right-index",
    layerId: "layer-copy",
  });
  const restored = editorReducer(deleted, { type: "undo" });

  assert.equal(duplicated.project.nails["right-index"].layers.length, 3);
  assert.equal(deleted.project.nails["right-index"].layers.length, 2);
  assert.equal(restored.project.nails["right-index"].layers.length, 3);
});

test("version-two layer scale migrates to explicit dimensions", () => {
  const raw = JSON.stringify({
    schemaVersion: 2,
    name: "Layer migration",
    nails: {
      "right-index": {
        layers: [{ id: "old", assetId: "design-soft-bow", scale: 44 }],
      },
    },
  });
  const project = parseStoredProject(raw);
  const layer = project?.nails["right-index"].layers[0];

  assert.equal(project?.schemaVersion, 3);
  assert.equal(layer?.width, 44);
  assert.equal(layer?.height, 44);
});

test("export includes placed vector artwork", () => {
  const state = editorReducer(createInitialEditorState(), {
    type: "add-layer",
    layer: createLayerFromAsset(ASSET_DEFINITIONS[0], "export-layer"),
  });
  const svg = createProjectSvg(state.project);

  assert.match(svg, /opacity="1"/);
  assert.match(svg, /rotate\(0\)/);
  assert.match(svg, /#f4c3d3/i);
});

test("recent asset preferences are bounded, unique, and safely parsed", () => {
  assert.deepEqual(
    parseRecentAssetIds(JSON.stringify(["design-soft-bow", "design-soft-bow", "chrome-gold-swoop"])),
    ["design-soft-bow", "chrome-gold-swoop"],
  );
  assert.deepEqual(parseRecentAssetIds("not-json"), []);
});

test("Precision Focus edits the same nail layer and shared history", () => {
  let state = createInitialEditorState();
  state = editorReducer(state, {
    type: "add-layer",
    layer: createLayerFromAsset(ASSET_DEFINITIONS[0], "precision-layer"),
  });
  state = editorReducer(state, {
    type: "update-layer",
    nailId: state.selectedNailId,
    layerId: "precision-layer",
    patch: { x: 34, y: 72, width: 48, height: 42, rotation: 27 },
  });

  const focusedLayer = state.project.nails["right-index"].layers[0];
  const nudged = editorReducer(state, {
    type: "update-layer",
    nailId: state.selectedNailId,
    layerId: focusedLayer.id,
    patch: createNudgePatch(focusedLayer, "right"),
  });
  const undone = editorReducer(nudged, { type: "undo" });
  const redone = editorReducer(undone, { type: "redo" });

  assert.equal(nudged.project.nails["right-index"].layers[0].x, 35);
  assert.equal(undone.project.nails["right-index"].layers[0].x, 34);
  assert.deepEqual(
    redone.project.nails["right-index"],
    nudged.project.nails["right-index"],
    "normal and focused views resolve the same project nail",
  );
});

test("Precision Focus zoom and nudges remain inside their boundaries", () => {
  const layer = createLayerFromAsset(ASSET_DEFINITIONS[0], "bounded-layer");
  const atMinimum = { ...layer, x: 0, y: 0 };
  const atMaximum = { ...layer, x: 100, y: 180 };

  assert.equal(clampPrecisionZoom(20), PRECISION_ZOOM_MIN);
  assert.equal(clampPrecisionZoom(220), PRECISION_ZOOM_MAX);
  assert.deepEqual(createNudgePatch(atMinimum, "left"), { x: 0 });
  assert.deepEqual(createNudgePatch(atMinimum, "up"), { y: 0 });
  assert.deepEqual(createNudgePatch(atMaximum, "right"), { x: 100 });
  assert.deepEqual(createNudgePatch(atMaximum, "down"), { y: 180 });
});

test("Precision Focus may open without a selected artwork layer", () => {
  const state = createInitialEditorState();

  assert.equal(state.selectedLayerId, null);
  assert.equal(state.project.nails[state.selectedNailId].layers.length, 0);
  assert.equal(state.past.length, 0);
});

test("native AI prompts resolve to current editable asset definitions", () => {
  const spec = fallbackNailSpec({
    prompt: "Long blush French tips with pearls, rhinestones, silver chrome bows and a chrome accent",
    shape: "almond",
    length: "long",
    baseColor: "#f4c3d3",
  });

  assert.equal(spec.strategy, "library");
  const assetIds = new Set(spec.nails.flatMap((nail) => nail.elements.map((element) => element.assetId)));
  assert.ok(assetIds.has("design-french-curve"));
  assert.ok(assetIds.has("charm-pearl-trio"));
  assert.ok(assetIds.has("charm-rhinestone"));
  assert.ok(assetIds.has("charm-metal-bow"));
  assert.ok(assetIds.has("chrome-silver-orbit"));
  assert.ok([...assetIds].every((assetId) => ASSET_BY_ID.has(assetId)));
});

test("novel AI prompts are routed to diffusion separately from native prompts", () => {
  const generative = fallbackNailSpec({
    prompt: "A photorealistic moonlit mountain landscape painted across each nail",
    shape: "oval",
    length: "medium",
    baseColor: "#252525",
  });
  const hybrid = fallbackNailSpec({
    prompt: "Pink bows over a photorealistic marble landscape",
    shape: "almond",
    length: "long",
    baseColor: "#f4c3d3",
  });

  assert.equal(generative.strategy, "generative");
  assert.equal(generative.nails.flatMap((nail) => nail.elements).length, 0);
  assert.equal(hybrid.strategy, "hybrid");
  assert.ok(hybrid.nails.some((nail) => nail.elements.some((element) => element.assetId === "design-soft-bow")));
  assert.ok(hybrid.novelConcepts.length > 0);
});

test("fallback AI builds concise concept-rich prompts and preserves editor finish", () => {
  const pumpkin = fallbackNailSpec({
    prompt: "fall pumpkin",
    shape: "almond",
    length: "long",
    finish: "matte",
    baseColor: "#f4c3d3",
  });
  const butterfly = fallbackNailSpec({
    prompt: "blue chrome jelly nail with a sculpted silver butterfly",
    shape: "coffin",
    length: "medium",
    finish: "glossy",
    baseColor: "#f4c3d3",
  });

  assert.equal(pumpkin.strategy, "generative");
  assert.equal(pumpkin.finish, "matte");
  assert.match(pumpkin.diffusionPrompt, /fall pumpkin/i);
  assert.match(pumpkin.diffusionPrompt, /autumn burnt-orange/i);
  assert.match(pumpkin.diffusionPrompt, /recognizable orange pumpkin/i);
  assert.match(pumpkin.diffusionPrompt, /green stem/i);
  assert.match(pumpkin.negativePrompt, /plain nude nail/i);
  assert.match(pumpkin.negativePrompt, /watermark/i);

  assert.equal(butterfly.finish, "jelly");
  assert.match(butterfly.diffusionPrompt, /reflective chrome/i);
  assert.match(butterfly.diffusionPrompt, /translucent jelly/i);
  assert.match(butterfly.diffusionPrompt, /raised sculpted gel/i);
  assert.match(butterfly.diffusionPrompt, /recognizable butterfly/i);
  assert.match(butterfly.diffusionPrompt, /open detailed wings/i);
});

test("AI application replaces the set once, remains undoable, and supports generated artwork", () => {
  const initial = createInitialEditorState();
  const spec = fallbackNailSpec({
    prompt: "Lavender aura with bows and a photorealistic marble texture",
    shape: "coffin",
    length: "medium",
    baseColor: "#c8b6df",
  });
  let nextId = 0;
  const applied = applyNailSpec(initial.project, spec, {
    createId: () => `ai-layer-${++nextId}`,
    generatedArtwork: {
      dataURI: "data:image/png;base64,AAAA",
      nailId: "right-index",
    },
  });
  const state = editorReducer(initial, { type: "apply-ai-result", project: applied.project });

  assert.equal(state.past.length, 1);
  assert.ok(applied.summary.nativeLayerCount > 0);
  assert.equal(applied.summary.generatedLayerCount, 1);
  assert.ok(Object.values(state.project.nails).every((nail) => nail.shape === "coffin"));
  assert.equal(
    state.project.nails["right-index"].layers[0].assetId,
    GENERATED_ARTWORK_ASSET_ID,
  );
  assert.equal(state.project.nails["right-index"].layers[0].imageData, "data:image/png;base64,AAAA");
  assert.match(createProjectSvg(state.project), /<image/);

  const undone = editorReducer(state, { type: "undo" });
  assert.deepEqual(undone.project, initial.project);
});
