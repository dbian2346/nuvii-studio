"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { AiAssistant } from "@/features/ai/components/ai-assistant";
import { applyNailSpec } from "@/features/ai/domain/apply-nail-spec";
import type { AiAppliedSummary } from "@/features/ai/domain/types";
import type { NailSetSpec } from "@/lib/nuvii-ai";
import { createLayerFromAsset } from "../domain/asset-data";
import type {
  AssetDefinition,
  EditableNailProperty,
  EditorTool,
  InspectorSection,
  NailAppearancePatch,
  NailId,
  NailLayerPatch,
} from "../domain/types";
import { useEditor } from "../hooks/use-editor";
import { downloadProjectPng } from "../services/export-project";
import { AssetBrowser } from "./asset-browser";
import { EditorInspector } from "./editor-inspector";
import { LayersPanel } from "./layers-panel";
import { NailCanvas } from "./nail-canvas";
import { PrecisionNailFocus } from "./precision-nail-focus";
import { ToolSidebar } from "./tool-sidebar";
import { TopNavigation } from "./top-navigation";
import styles from "./editor.module.css";

export function EditorScreen() {
  const {
    state,
    dispatch,
    saveNow,
    saveError,
    saveStatus,
    shortcutNotice,
    canRedo,
    canUndo,
  } = useEditor();
  const [exporting, setExporting] = useState(false);
  const [precisionFocusOpen, setPrecisionFocusOpen] = useState(false);
  const [precisionReturnFocus, setPrecisionReturnFocus] = useState<HTMLElement | null>(null);
  const [notice, setNotice] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const selectedNail = state.project.nails[state.selectedNailId];
  const selectedLayer = selectedNail.layers.find(
    (layer) => layer.id === state.selectedLayerId,
  );
  const visibleNotice = notice ?? (saveError
    ? { message: saveError, tone: "error" as const }
    : shortcutNotice
      ? { message: shortcutNotice, tone: "success" as const }
      : null);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(
      () => setNotice(null),
      notice.tone === "error" ? 8_000 : 4_500,
    );
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const showNotice = useCallback((message: string, tone: "error" | "success" = "success") => {
    setNotice({ message, tone });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setNotice(null);
    try {
      await downloadProjectPng(state.project);
      showNotice("Export complete. The PNG was downloaded to your device.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The PNG could not be created.";
      showNotice(
        `${detail} Your project is safe. Try Export again in a current browser.`,
        "error",
      );
    } finally {
      setExporting(false);
    }
  }, [showNotice, state.project]);

  const handleSave = useCallback(() => {
    if (saveNow()) showNotice("Project saved locally.");
  }, [saveNow, showNotice]);

  const selectNail = useCallback((nailId: NailId) => {
    dispatch({ type: "select-nail", nailId });
  }, [dispatch]);

  const focusNail = useCallback((nailId: NailId, returnFocusTo?: HTMLElement) => {
    setPrecisionReturnFocus(returnFocusTo ?? (
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    ));
    dispatch({ type: "select-nail", nailId });
    setPrecisionFocusOpen(true);
  }, [dispatch]);

  const selectTool = useCallback((tool: EditorTool) => {
    dispatch({ type: "select-tool", tool });
  }, [dispatch]);

  const selectSection = useCallback((section: InspectorSection) => {
    dispatch({ type: "select-section", section });
  }, [dispatch]);

  const updateNail = useCallback((patch: NailAppearancePatch) => {
    dispatch({ type: "update-selected-nail", patch });
  }, [dispatch]);

  const applyToAll = useCallback((property: EditableNailProperty) => {
    dispatch({ type: "apply-selected-to-all", property });
  }, [dispatch]);

  const addAsset = useCallback((asset: AssetDefinition) => {
    const layer = createLayerFromAsset(asset, crypto.randomUUID());
    dispatch({ type: "add-layer", layer });
    showNotice(`${asset.name} added to ${selectedNail.label}.`);
  }, [dispatch, selectedNail.label, showNotice]);

  const selectLayer = useCallback((nailId: NailId, layerId: string) => {
    dispatch({ type: "select-layer", nailId, layerId });
  }, [dispatch]);

  const updateLayer = useCallback((
    nailId: NailId,
    layerId: string,
    patch: NailLayerPatch,
  ) => {
    dispatch({ type: "update-layer", nailId, layerId, patch });
  }, [dispatch]);

  const updateSelectedLayer = useCallback((layerId: string, patch: NailLayerPatch) => {
    dispatch({
      type: "update-layer",
      nailId: state.selectedNailId,
      layerId,
      patch,
    });
  }, [dispatch, state.selectedNailId]);

  const selectSelectedLayer = useCallback((layerId: string) => {
    selectLayer(state.selectedNailId, layerId);
  }, [selectLayer, state.selectedNailId]);

  const duplicateLayer = useCallback((layerId: string) => {
    dispatch({
      type: "duplicate-layer",
      nailId: state.selectedNailId,
      layerId,
      newLayerId: crypto.randomUUID(),
    });
  }, [dispatch, state.selectedNailId]);

  const deleteLayer = useCallback((layerId: string) => {
    dispatch({ type: "delete-layer", nailId: state.selectedNailId, layerId });
  }, [dispatch, state.selectedNailId]);

  const moveLayer = useCallback((
    layerId: string,
    direction: "forward" | "backward",
  ) => {
    dispatch({
      type: "move-layer",
      nailId: state.selectedNailId,
      layerId,
      direction,
    });
  }, [dispatch, state.selectedNailId]);

  const undo = useCallback(() => dispatch({ type: "undo" }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: "redo" }), [dispatch]);

  const applyAiDesign = useCallback((
    spec: NailSetSpec,
    generatedImage?: string,
  ): AiAppliedSummary => {
    const applied = applyNailSpec(state.project, spec, {
      createId: () => crypto.randomUUID(),
      generatedArtwork: generatedImage
        ? { dataURI: generatedImage, nailId: state.selectedNailId }
        : undefined,
    });
    dispatch({ type: "apply-ai-result", project: applied.project });
    showNotice(generatedImage
      ? `Nuvii applied editable layers and generated artwork to ${selectedNail.label}.`
      : "Nuvii built an editable ten-nail set.");
    return applied.summary;
  }, [dispatch, selectedNail.label, showNotice, state.project, state.selectedNailId]);

  return (
    <main className={styles.viewport} data-nuvii-ui>
      <div className={styles.editorShell}>
        <div
          aria-hidden={precisionFocusOpen || undefined}
          className={styles.editorChrome}
          inert={precisionFocusOpen || undefined}
        >
          <TopNavigation
            canRedo={canRedo}
            canUndo={canUndo}
            exporting={exporting}
            onExport={handleExport}
            onRedo={redo}
            onSave={handleSave}
            onUndo={undo}
            saveError={saveError}
            saveStatus={saveStatus}
          />

          <div className={styles.workspace}>
            <ToolSidebar activeTool={state.activeTool} onSelectTool={selectTool} />

            <div className={styles.centerStage}>
              <div className={styles.breadcrumbPosition}>
                <Breadcrumbs
                  items={[
                    { href: "/projects", label: "Projects" },
                    { label: state.project.collectionName },
                    { label: state.project.name },
                  ]}
                />
              </div>
              <Button
                className={styles.focusNailAction}
                onClick={(event) => {
                  focusNail(state.selectedNailId, event.currentTarget);
                }}
                size="compact"
              >
                Focus Nail
              </Button>
              <NailCanvas
                onFocusNail={focusNail}
                onSelectNail={selectNail}
                onSelectLayer={selectLayer}
                onUpdateLayer={updateLayer}
                project={state.project}
                selectedLayerId={state.selectedLayerId}
                selectedNailId={state.selectedNailId}
              />
            </div>

            {state.activeTool === "properties" ? (
              <EditorInspector
                activeSection={state.activeSection}
                nail={selectedNail}
                onApplyToAll={applyToAll}
                onSelectSection={selectSection}
                onUpdateNail={updateNail}
              />
            ) : null}
            {state.activeTool === "assets" ? (
              <AssetBrowser
                nail={selectedNail}
                onAddAsset={addAsset}
                recentAssetIds={state.recentAssetIds}
                selectedAssetId={selectedLayer?.assetId}
              />
            ) : null}
            {state.activeTool === "layers" ? (
              <LayersPanel
                nail={selectedNail}
                onDelete={deleteLayer}
                onDuplicate={duplicateLayer}
                onMove={moveLayer}
                onSelect={selectSelectedLayer}
                onUpdate={updateSelectedLayer}
                selectedLayerId={state.selectedLayerId}
              />
            ) : null}
            {state.activeTool === "ai" ? (
              <AiAssistant
                nail={selectedNail}
                onApply={applyAiDesign}
                onViewLayers={() => selectTool("layers")}
              />
            ) : null}
          </div>

          {visibleNotice ? (
            <div
              aria-live={visibleNotice.tone === "error" ? "assertive" : "polite"}
              className={`${styles.toast} ${visibleNotice.tone === "error" ? styles.toastError : ""}`}
              role={visibleNotice.tone === "error" ? "alert" : "status"}
            >
              {visibleNotice.message}
            </div>
          ) : null}
        </div>

        {precisionFocusOpen ? (
          <PrecisionNailFocus
            canRedo={canRedo}
            canUndo={canUndo}
            nail={selectedNail}
            onClose={() => setPrecisionFocusOpen(false)}
            onDeleteLayer={deleteLayer}
            onDuplicateLayer={duplicateLayer}
            onMoveLayer={moveLayer}
            onRedo={redo}
            onSelectLayer={selectSelectedLayer}
            onUndo={undo}
            onUpdateLayer={updateSelectedLayer}
            onUpdateNail={updateNail}
            returnFocusTo={precisionReturnFocus}
            selectedLayerId={state.selectedLayerId}
          />
        ) : null}
      </div>
    </main>
  );
}
