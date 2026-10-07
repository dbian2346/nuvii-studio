"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { ColorSwatch } from "@/components/ui/color-swatch";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { COLOR_OPTIONS, FINISH_OPTIONS } from "../domain/editor-data";
import {
  clampPrecisionZoom,
  PRECISION_ZOOM_MAX,
  PRECISION_ZOOM_MIN,
  PRECISION_ZOOM_STEP,
} from "../domain/precision";
import type { Nail, NailAppearancePatch, NailLayerPatch } from "../domain/types";
import { LayerControls, LayerList } from "./layer-stack";
import { NailSurface } from "./nail-surface";
import styles from "./editor.module.css";

const iconRoot = "/icons/nuvii";
type PrecisionPanel = "layer" | "nail";
type PrecisionCanvasStyle = CSSProperties & { "--precision-zoom": string };

function ignoreNailSelection() {}

interface PrecisionNailFocusProps {
  canRedo: boolean;
  canUndo: boolean;
  nail: Nail;
  onClose: () => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onExportNail: () => Promise<void>;
  onMoveLayer: (layerId: string, direction: "forward" | "backward") => void;
  onRedo: () => void;
  onSelectLayer: (layerId: string) => void;
  onUndo: () => void;
  onUpdateLayer: (layerId: string, patch: NailLayerPatch) => void;
  onUpdateNail: (patch: NailAppearancePatch) => void;
  returnFocusTo: HTMLElement | null;
  selectedLayerId: string | null;
}

function PrecisionNailSettings({
  nail,
  onUpdateNail,
}: Pick<PrecisionNailFocusProps, "nail" | "onUpdateNail">) {
  return (
    <div className={styles.precisionNailSettings}>
      <section aria-labelledby="precision-base-title">
        <div className={styles.precisionSectionHeading}>
          <div>
            <p id="precision-base-title">Base colour</p>
            <strong>{nail.baseColor.toUpperCase()}</strong>
          </div>
          <label className={styles.precisionCustomColour}>
            <span className={styles.visuallyHidden}>Choose a custom base colour</span>
            <input
              aria-label="Choose a custom base colour in Precision Focus"
              onChange={(event) => onUpdateNail({ baseColor: event.target.value })}
              type="color"
              value={nail.baseColor}
            />
          </label>
        </div>
        <div aria-label="Precision base colour presets" className={styles.precisionSwatches} role="group">
          {COLOR_OPTIONS.map((color) => (
            <ColorSwatch
              aria-label={`Use ${color.name} in Precision Focus`}
              className={styles.precisionSwatch}
              color={color.value}
              key={color.value}
              onClick={() => onUpdateNail({ baseColor: color.value })}
              selected={nail.baseColor.toLowerCase() === color.value}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="precision-finish-title">
        <p className={styles.precisionControlLabel} id="precision-finish-title">
          Finish
        </p>
        <div aria-label="Precision nail finish" className={styles.precisionFinishGrid} role="group">
          {FINISH_OPTIONS.map((finish) => (
            <button
              aria-pressed={nail.finish === finish.value}
              className={styles.precisionOptionButton}
              key={finish.value}
              onClick={() => onUpdateNail({ finish: finish.value })}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`${styles.finishSample} ${styles[finish.value]}`}
              />
              {finish.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PrecisionNailFocus({
  canRedo,
  canUndo,
  nail,
  onClose,
  onDeleteLayer,
  onDuplicateLayer,
  onExportNail,
  onMoveLayer,
  onRedo,
  onSelectLayer,
  onUndo,
  onUpdateLayer,
  onUpdateNail,
  returnFocusTo,
  selectedLayerId,
}: PrecisionNailFocusProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activePanel, setActivePanel] = useState<PrecisionPanel>(
    selectedLayerId ? "layer" : "nail",
  );
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nailExportStatus, setNailExportStatus] = useState<
    { message: string; tone: "error" | "success" } | null
  >(null);
  const [nailExporting, setNailExporting] = useState(false);
  const [zoom, setZoom] = useState(100);
  const canvasStyle: PrecisionCanvasStyle = {
    "--precision-zoom": `${zoom / 100}`,
  };
  const selectFocusedLayer = useCallback((_: Nail["id"], layerId: string) => {
    onSelectLayer(layerId);
  }, [onSelectLayer]);
  const updateFocusedLayer = useCallback((
    _: Nail["id"],
    layerId: string,
    patch: NailLayerPatch,
  ) => {
    onUpdateLayer(layerId, patch);
  }, [onUpdateLayer]);

  useEffect(() => {
    setFullscreenSupported(typeof dialogRef.current?.requestFullscreen === "function");
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === dialogRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function closeFocus() {
    if (document.fullscreenElement === dialogRef.current) {
      await document.exitFullscreen().catch(() => undefined);
    }
    onClose();
  }

  async function toggleFullscreen() {
    if (!dialogRef.current || !fullscreenSupported) return;
    setNailExportStatus(null);
    setFullscreenError("");
    try {
      if (document.fullscreenElement === dialogRef.current) {
        await document.exitFullscreen();
      } else {
        await dialogRef.current.requestFullscreen();
      }
    } catch {
      setFullscreenError(
        "Fullscreen is unavailable right now. Precision editing is still available in this window.",
      );
    }
  }

  async function exportFocusedNail() {
    setFullscreenError("");
    setNailExporting(true);
    setNailExportStatus(null);
    try {
      await onExportNail();
      setNailExportStatus({
        message: "Single-nail PNG downloaded.",
        tone: "success",
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The nail PNG could not be created.";
      setNailExportStatus({
        message: `${detail} Your design is safe. Try again in a current browser.`,
        tone: "error",
      });
    } finally {
      setNailExporting(false);
    }
  }

  const handleDialogKeyDown = useDialogFocus({
    dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: closeFocus,
    returnFocusTo,
  });

  function handlePanelTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextPanel: PrecisionPanel | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextPanel = activePanel === "layer" ? "nail" : "layer";
    }
    if (event.key === "Home") nextPanel = "layer";
    if (event.key === "End") nextPanel = "nail";
    if (nextPanel === null) return;
    event.preventDefault();
    setActivePanel(nextPanel);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`#precision-${nextPanel}-tab`)
      ?.focus();
  }

  return (
    <div
      aria-describedby="precision-focus-description"
      aria-labelledby="precision-focus-title"
      aria-modal="true"
      className={styles.precisionFocus}
      onKeyDown={handleDialogKeyDown}
      ref={dialogRef}
      role="dialog"
    >
      <header className={styles.precisionHeader}>
        <div className={styles.precisionTitleBlock}>
          <span>Precision Nail Focus</span>
          <h2 id="precision-focus-title">{nail.hand} {nail.label}</h2>
          <p className={styles.visuallyHidden} id="precision-focus-description">
            Edit the selected nail and its shared artwork layers. Press Escape to return to the editor.
          </p>
        </div>

        <div className={styles.precisionHistoryActions}>
          <IconButton aria-label="Undo in Precision Focus" disabled={!canUndo} onClick={onUndo} size="compact">
            <Icon size="small" src={`${iconRoot}/undo.svg`} />
          </IconButton>
          <IconButton aria-label="Redo in Precision Focus" disabled={!canRedo} onClick={onRedo} size="compact">
            <Icon size="small" src={`${iconRoot}/redo.svg`} />
          </IconButton>
        </div>

        <div aria-label="Precision view zoom" className={styles.precisionZoomControls} role="group">
          <IconButton
            aria-label="Zoom out"
            disabled={zoom === PRECISION_ZOOM_MIN}
            onClick={() => setZoom((value) => clampPrecisionZoom(value - PRECISION_ZOOM_STEP))}
            size="compact"
          >
            <span aria-hidden="true">−</span>
          </IconButton>
          <label>
            <span className={styles.visuallyHidden}>Precision zoom percentage</span>
            <input
              aria-label="Precision zoom percentage"
              max={PRECISION_ZOOM_MAX}
              min={PRECISION_ZOOM_MIN}
              onChange={(event) => setZoom(clampPrecisionZoom(Number(event.currentTarget.value)))}
              step={PRECISION_ZOOM_STEP}
              type="range"
              value={zoom}
            />
          </label>
          <output aria-live="polite">{zoom}%</output>
          <IconButton
            aria-label="Zoom in"
            disabled={zoom === PRECISION_ZOOM_MAX}
            onClick={() => setZoom((value) => clampPrecisionZoom(value + PRECISION_ZOOM_STEP))}
            size="compact"
          >
            <span aria-hidden="true">+</span>
          </IconButton>
        </div>

        <Button loading={nailExporting} onClick={() => void exportFocusedNail()} size="compact">
          {nailExporting ? "Exporting…" : "Export Nail"}
        </Button>

        <IconButton
          aria-label={!fullscreenSupported
            ? "Fullscreen unavailable in this browser"
            : isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          disabled={!fullscreenSupported}
          onClick={() => void toggleFullscreen()}
          size="compact"
        >
          <span aria-hidden="true">⛶</span>
        </IconButton>
        <IconButton
          aria-label="Close Precision Nail Focus"
          onClick={() => void closeFocus()}
          ref={closeButtonRef}
          size="compact"
        >
          <span aria-hidden="true">×</span>
        </IconButton>
        {nailExportStatus ? (
          <span
            className={`${styles.precisionExportMessage} ${
              nailExportStatus.tone === "error" ? styles.precisionExportError : ""
            }`}
            role={nailExportStatus.tone === "error" ? "alert" : "status"}
          >
            {nailExportStatus.message}
          </span>
        ) : null}
        {fullscreenError ? (
          <span className={`${styles.precisionExportMessage} ${styles.precisionExportError}`} role="alert">
            {fullscreenError}
          </span>
        ) : null}
      </header>

      <div className={styles.precisionWorkspace}>
        <section aria-label={`Precision canvas for ${nail.label}`} className={styles.precisionCanvas}>
          <div className={styles.precisionCanvasScroller}>
            <div className={styles.precisionNailZoom} style={canvasStyle}>
              <NailSurface
                nail={nail}
                onSelect={ignoreNailSelection}
                onSelectLayer={selectFocusedLayer}
                onUpdateLayer={updateFocusedLayer}
                presentation="focus"
                selected
                selectedLayerId={selectedLayerId}
              />
            </div>
          </div>
          <p className={styles.precisionCanvasHint}>
            Drag artwork directly. Use arrow keys for 2-unit nudges; hold Shift for 10.
          </p>
        </section>

        <aside aria-labelledby="precision-layers-title" className={styles.precisionPanel}>
          <div className={styles.precisionPanelHeader}>
            <Icon size="medium" src={`${iconRoot}/layers.svg`} />
            <div>
              <h3 id="precision-layers-title">Layers</h3>
              <p>{nail.layers.length} {nail.layers.length === 1 ? "layer" : "layers"}</p>
            </div>
          </div>

          <div className={styles.precisionLayerList}>
            <LayerList
              nail={nail}
              onSelect={(layerId) => {
                onSelectLayer(layerId);
                setActivePanel("layer");
              }}
              selectedLayerId={selectedLayerId}
            />
          </div>

          <div aria-label="Precision inspector" className={styles.precisionTabs} role="tablist">
            <button
              aria-controls="precision-layer-panel"
              aria-selected={activePanel === "layer"}
              id="precision-layer-tab"
              onClick={() => setActivePanel("layer")}
              onKeyDown={handlePanelTabKeyDown}
              role="tab"
              tabIndex={activePanel === "layer" ? 0 : -1}
              type="button"
            >
              Layer
            </button>
            <button
              aria-controls="precision-nail-panel"
              aria-selected={activePanel === "nail"}
              id="precision-nail-tab"
              onClick={() => setActivePanel("nail")}
              onKeyDown={handlePanelTabKeyDown}
              role="tab"
              tabIndex={activePanel === "nail" ? 0 : -1}
              type="button"
            >
              Nail
            </button>
          </div>

          <div className={styles.precisionPanelBody}>
            {activePanel === "layer" ? (
              <div aria-labelledby="precision-layer-tab" id="precision-layer-panel" role="tabpanel">
                <LayerControls
                  headingId="precision-layer-controls-title"
                  nail={nail}
                  onDelete={onDeleteLayer}
                  onDuplicate={onDuplicateLayer}
                  onMove={onMoveLayer}
                  onUpdate={onUpdateLayer}
                  precision
                  selectedLayerId={selectedLayerId}
                />
              </div>
            ) : (
              <div aria-labelledby="precision-nail-tab" id="precision-nail-panel" role="tabpanel">
                <PrecisionNailSettings nail={nail} onUpdateNail={onUpdateNail} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
