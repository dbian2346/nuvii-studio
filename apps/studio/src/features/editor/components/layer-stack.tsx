import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ASSET_BY_ID } from "../domain/asset-data";
import { COLOR_OPTIONS } from "../domain/editor-data";
import { createNudgePatch } from "../domain/precision";
import type { Nail, NailLayer, NailLayerPatch } from "../domain/types";
import { AssetArtwork } from "./asset-artwork";
import styles from "./editor.module.css";

const iconRoot = "/icons/nuvii";

interface LayerListProps {
  nail: Nail;
  onSelect: (layerId: string) => void;
  selectedLayerId: string | null;
}

interface LayerControlsProps {
  headingId?: string;
  nail: Nail;
  onDelete: (layerId: string) => void;
  onDuplicate: (layerId: string) => void;
  onMove: (layerId: string, direction: "forward" | "backward") => void;
  onUpdate: (layerId: string, patch: NailLayerPatch) => void;
  precision?: boolean;
  selectedLayerId: string | null;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function LayerRow({
  layer,
  onSelect,
  selected,
}: {
  layer: NailLayer;
  onSelect: (layerId: string) => void;
  selected: boolean;
}) {
  const asset = ASSET_BY_ID.get(layer.assetId);
  return (
    <button
      aria-pressed={selected}
      className={styles.layerRow}
      onClick={() => onSelect(layer.id)}
      type="button"
    >
      <span className={styles.layerThumbnail}>
        {asset ? <AssetArtwork asset={asset} color={layer.color} /> : null}
        {!asset && layer.imageData ? (
          <svg aria-hidden="true" className={styles.assetArtwork} viewBox="0 0 100 100">
            <image height="100" href={layer.imageData} preserveAspectRatio="xMidYMid slice" width="100" />
          </svg>
        ) : null}
      </span>
      <span className={styles.layerRowText}>
        <strong>{layer.name}</strong>
        <span>{Math.round(layer.opacity * 100)}% opacity</span>
      </span>
    </button>
  );
}

function LayerSlider({
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
}) {
  const rounded = Math.round(value);
  const commit = (next: number) => onChange(clamp(next, min, max));

  return (
    <label className={styles.layerSlider}>
      <span>
        {label}
        <span className={styles.layerNumberField}>
          <input
            aria-label={`${label} value`}
            defaultValue={rounded}
            key={`${label}-${rounded}`}
            max={max}
            min={min}
            onBlur={(event) => commit(Number(event.currentTarget.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            type="number"
          />
          {suffix}
        </span>
      </span>
      <input
        aria-label={`${label} slider`}
        defaultValue={value}
        key={`${label}-slider-${value}`}
        max={max}
        min={min}
        onKeyUp={(event) => commit(Number(event.currentTarget.value))}
        onPointerUp={(event) => commit(Number(event.currentTarget.value))}
        type="range"
      />
    </label>
  );
}

export function LayerList({ nail, onSelect, selectedLayerId }: LayerListProps) {
  return nail.layers.length > 0 ? (
    <div aria-label="Nail layers, topmost first" className={styles.layerList}>
      {[...nail.layers].reverse().map((layer) => (
        <LayerRow
          key={layer.id}
          layer={layer}
          onSelect={onSelect}
          selected={layer.id === selectedLayerId}
        />
      ))}
    </div>
  ) : (
    <div className={styles.layerEmptyState}>
      <Icon size="large" src={`${iconRoot}/layers.svg`} />
      <strong>No artwork layers</strong>
      <p>Open Assets to add editable artwork to this nail.</p>
    </div>
  );
}

export function LayerControls({
  headingId = "layer-controls-title",
  nail,
  onDelete,
  onDuplicate,
  onMove,
  onUpdate,
  precision = false,
  selectedLayerId,
}: LayerControlsProps) {
  const selectedLayer = nail.layers.find((layer) => layer.id === selectedLayerId);
  const selectedIndex = selectedLayer
    ? nail.layers.findIndex((layer) => layer.id === selectedLayer.id)
    : -1;

  if (!selectedLayer) {
    return precision ? (
      <div className={styles.precisionControlEmpty}>
        <strong>Select a layer</strong>
        <p>Choose artwork on the nail or in the layer stack to edit it precisely.</p>
      </div>
    ) : null;
  }

  const layer = selectedLayer;

  function updateSize(nextSize: number) {
    const currentSize = layer.kind === "generated"
      ? layer.width
      : Math.max(layer.width, layer.height);
    const factor = nextSize / currentSize;
    onUpdate(layer.id, {
      width: Math.max(8, Math.min(100, layer.width * factor)),
      height: Math.max(8, Math.min(180, layer.height * factor)),
    });
  }

  return (
    <section aria-labelledby={headingId} className={styles.layerControls}>
      <div className={styles.layerControlHeading}>
        <div>
          <p id={headingId}>Selected layer</p>
          <strong>{selectedLayer.name}</strong>
        </div>
        <div className={styles.layerQuickActions}>
          <IconButton
            aria-label={`Duplicate ${selectedLayer.name}`}
            onClick={() => onDuplicate(selectedLayer.id)}
            size="compact"
          >
            <Icon size="small" src={`${iconRoot}/add.svg`} />
          </IconButton>
          <IconButton
            aria-label={`Delete ${selectedLayer.name}`}
            className={styles.deleteLayerButton}
            onClick={() => onDelete(selectedLayer.id)}
            size="compact"
          >
            <span aria-hidden="true">×</span>
          </IconButton>
        </div>
      </div>

      {precision ? (
        <div className={styles.precisionPositionControls}>
          <div className={styles.precisionCoordinateFields}>
            <label>
              <span>X</span>
              <input
                aria-label="Layer X position"
                defaultValue={Math.round(selectedLayer.x)}
                key={`x-${selectedLayer.x}`}
                max={100}
                min={0}
                onBlur={(event) =>
                  onUpdate(selectedLayer.id, {
                    x: clamp(Number(event.currentTarget.value), 0, 100),
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                type="number"
              />
            </label>
            <label>
              <span>Y</span>
              <input
                aria-label="Layer Y position"
                defaultValue={Math.round(selectedLayer.y)}
                key={`y-${selectedLayer.y}`}
                max={180}
                min={0}
                onBlur={(event) =>
                  onUpdate(selectedLayer.id, {
                    y: clamp(Number(event.currentTarget.value), 0, 180),
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                type="number"
              />
            </label>
          </div>
          <div aria-label="Fine position nudges" className={styles.precisionNudgeGrid} role="group">
            <IconButton
              aria-label="Nudge layer up"
              className={styles.nudgeUp}
              onClick={() => onUpdate(selectedLayer.id, createNudgePatch(selectedLayer, "up"))}
              size="compact"
            >
              <span aria-hidden="true">↑</span>
            </IconButton>
            <IconButton
              aria-label="Nudge layer left"
              className={styles.nudgeLeft}
              onClick={() => onUpdate(selectedLayer.id, createNudgePatch(selectedLayer, "left"))}
              size="compact"
            >
              <span aria-hidden="true">←</span>
            </IconButton>
            <span aria-hidden="true" className={styles.nudgeCenter}>1</span>
            <IconButton
              aria-label="Nudge layer right"
              className={styles.nudgeRight}
              onClick={() => onUpdate(selectedLayer.id, createNudgePatch(selectedLayer, "right"))}
              size="compact"
            >
              <span aria-hidden="true">→</span>
            </IconButton>
            <IconButton
              aria-label="Nudge layer down"
              className={styles.nudgeDown}
              onClick={() => onUpdate(selectedLayer.id, createNudgePatch(selectedLayer, "down"))}
              size="compact"
            >
              <span aria-hidden="true">↓</span>
            </IconButton>
          </div>
        </div>
      ) : null}

      <LayerSlider
        label="Opacity"
        max={100}
        min={0}
        onChange={(value) => onUpdate(selectedLayer.id, { opacity: value / 100 })}
        suffix="%"
        value={selectedLayer.opacity * 100}
      />
      <LayerSlider
        label="Size"
        max={100}
        min={8}
        onChange={updateSize}
        suffix="%"
        value={selectedLayer.kind === "generated"
          ? selectedLayer.width
          : Math.max(selectedLayer.width, selectedLayer.height)}
      />
      <LayerSlider
        label="Rotation"
        max={180}
        min={-180}
        onChange={(value) => onUpdate(selectedLayer.id, { rotation: value })}
        suffix="°"
        value={selectedLayer.rotation}
      />

      {selectedLayer.tintable ? (
        <div className={styles.layerColourStack}>
          <label className={styles.layerColourControl}>
            <span>Artwork colour</span>
            <input
              aria-label={`Custom colour for ${selectedLayer.name}`}
              onChange={(event) =>
                onUpdate(selectedLayer.id, { color: event.target.value })
              }
              type="color"
              value={selectedLayer.color}
            />
          </label>
          <div
            aria-label={`Colour presets for ${selectedLayer.name}`}
            className={styles.layerColourOptions}
            role="group"
          >
            {COLOR_OPTIONS.map((color) => (
              <button
                aria-label={`Use ${color.name} for ${selectedLayer.name}`}
                aria-pressed={selectedLayer.color.toLowerCase() === color.value}
                key={color.value}
                onClick={() => onUpdate(selectedLayer.id, { color: color.value })}
                style={{ backgroundColor: color.value }}
                type="button"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.layerOrderActions}>
        <Button
          disabled={selectedIndex === nail.layers.length - 1}
          onClick={() => onMove(selectedLayer.id, "forward")}
          size="compact"
          variant="ghost"
        >
          Bring forward
        </Button>
        <Button
          disabled={selectedIndex === 0}
          onClick={() => onMove(selectedLayer.id, "backward")}
          size="compact"
          variant="ghost"
        >
          Send backward
        </Button>
      </div>
    </section>
  );
}
