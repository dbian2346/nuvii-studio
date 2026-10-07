import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ASSET_BY_ID } from "../domain/asset-data";
import { SHAPE_PATHS } from "../domain/editor-data";
import type { NailId, NailLayer, NailLayerPatch, NailShape } from "../domain/types";
import { AssetArtwork } from "./asset-artwork";
import styles from "./editor.module.css";

type InteractionMode = "move" | "resize" | "rotate";

interface LayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface Interaction {
  mode: InteractionMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startAngle: number;
  start: LayerTransform;
  nailRect: DOMRect;
}

type PlacedLayerStyle = CSSProperties & {
  "--layer-height": string;
  "--layer-left": string;
  "--layer-opacity": number;
  "--layer-rotation": string;
  "--layer-top": string;
  "--layer-width": string;
};

interface PlacedLayerProps {
  layer: NailLayer;
  nailId: NailId;
  nailShape: NailShape;
  onCommit: (nailId: NailId, layerId: string, patch: NailLayerPatch) => void;
  onSelect: (nailId: NailId, layerId: string) => void;
  selected: boolean;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function transformOf(layer: NailLayer): LayerTransform {
  return {
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
  };
}

export const PlacedLayer = memo(function PlacedLayer({
  layer,
  nailId,
  nailShape,
  onCommit,
  onSelect,
  selected,
}: PlacedLayerProps) {
  const asset = ASSET_BY_ID.get(layer.assetId);
  const interaction = useRef<Interaction | null>(null);
  const draftRef = useRef<LayerTransform | null>(null);
  const stopInteraction = useRef<(() => void) | null>(null);
  const [draft, setDraft] = useState<LayerTransform | null>(null);
  const current = draft ?? transformOf(layer);
  const style: PlacedLayerStyle = {
    "--layer-height": `${(current.height / 180) * 100}%`,
    "--layer-left": `${current.x}%`,
    "--layer-opacity": layer.opacity,
    "--layer-rotation": `${current.rotation}deg`,
    "--layer-top": `${(current.y / 180) * 100}%`,
    "--layer-width": `${current.width}%`,
  };

  useEffect(() => () => {
    stopInteraction.current?.();
    interaction.current = null;
    draftRef.current = null;
  }, []);

  if (!asset && !layer.imageData) return null;

  function updateDraftFromPointer(clientX: number, clientY: number) {
    const active = interaction.current;
    if (!active) return;
    const deltaX = clientX - active.startClientX;
    const deltaY = clientY - active.startClientY;
    let next = active.start;

    if (active.mode === "move") {
      next = {
        ...active.start,
        x: clamp(active.start.x + (deltaX / active.nailRect.width) * 100, 0, 100),
        y: clamp(active.start.y + (deltaY / active.nailRect.height) * 180, 0, 180),
      };
    } else if (active.mode === "resize") {
      const factor = clamp(
        1 + deltaX / active.nailRect.width + deltaY / active.nailRect.height,
        0.25,
        3,
      );
      next = {
        ...active.start,
        width: clamp(active.start.width * factor, 8, 100),
        height: clamp(active.start.height * factor, 8, 180),
      };
    } else {
      const centerX = active.nailRect.left + (active.start.x / 100) * active.nailRect.width;
      const centerY = active.nailRect.top + (active.start.y / 180) * active.nailRect.height;
      const angle = Math.atan2(clientY - centerY, clientX - centerX);
      next = {
        ...active.start,
        rotation: clamp(
          active.start.rotation + ((angle - active.startAngle) * 180) / Math.PI,
          -180,
          180,
        ),
      };
    }
    draftRef.current = next;
    setDraft(next);
  }

  function completeInteraction() {
    if (draftRef.current) onCommit(nailId, layer.id, draftRef.current);
    interaction.current = null;
    draftRef.current = null;
    setDraft(null);
  }

  function beginInteraction(event: ReactPointerEvent<HTMLElement>, mode: InteractionMode) {
    if (event.button !== 0) return;
    const nailLayerStack = event.currentTarget.closest<HTMLElement>("[data-nail-layer-stack]");
    if (!nailLayerStack) return;
    stopInteraction.current?.();
    event.preventDefault();
    event.stopPropagation();
    onSelect(nailId, layer.id);
    const nailRect = nailLayerStack.getBoundingClientRect();
    const centerX = nailRect.left + (layer.x / 100) * nailRect.width;
    const centerY = nailRect.top + (layer.y / 180) * nailRect.height;
    interaction.current = {
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
      start: transformOf(layer),
      nailRect,
    };
    const initialDraft = transformOf(layer);
    draftRef.current = initialDraft;
    setDraft(initialDraft);

    const move = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== event.pointerId) return;
      pointerEvent.preventDefault();
      updateDraftFromPointer(pointerEvent.clientX, pointerEvent.clientY);
    };
    const finish = (pointerEvent: PointerEvent) => {
      if (pointerEvent.pointerId !== event.pointerId) return;
      cleanup();
      completeInteraction();
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      if (stopInteraction.current === cleanup) stopInteraction.current = null;
    };
    stopInteraction.current = cleanup;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const amount = event.shiftKey ? 10 : 2;
    const patch: NailLayerPatch = {};
    if (event.key === "ArrowLeft") patch.x = clamp(layer.x - amount, 0, 100);
    if (event.key === "ArrowRight") patch.x = clamp(layer.x + amount, 0, 100);
    if (event.key === "ArrowUp") patch.y = clamp(layer.y - amount, 0, 180);
    if (event.key === "ArrowDown") patch.y = clamp(layer.y + amount, 0, 180);
    if (Object.keys(patch).length === 0) return;
    event.preventDefault();
    onCommit(nailId, layer.id, patch);
  }

  return (
    <div
      aria-label={`${layer.name} layer. Drag to move; use arrow keys to nudge.`}
      aria-pressed={selected}
      className={styles.placedLayer}
      data-layer-id={layer.id}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(nailId, layer.id);
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) return;
        beginInteraction(event, "move");
      }}
      role="button"
      style={style}
      tabIndex={0}
    >
      {asset ? <AssetArtwork asset={asset} color={layer.color} /> : (
        <svg aria-hidden="true" className={styles.assetArtwork} preserveAspectRatio="none" viewBox="0 0 100 180">
          <defs>
            <clipPath id={`generated-${layer.id}`}>
              <path d={SHAPE_PATHS[nailShape]} />
            </clipPath>
          </defs>
          <image
            clipPath={`url(#generated-${layer.id})`}
            height="180"
            href={layer.imageData}
            preserveAspectRatio="xMidYMid slice"
            width="100"
          />
        </svg>
      )}
      {selected ? (
        <>
          <button
            aria-label={`Rotate ${layer.name}`}
            className={`${styles.layerHandle} ${styles.rotateHandle}`}
            onPointerDown={(event) => beginInteraction(event, "rotate")}
            type="button"
          />
          <button
            aria-label={`Resize ${layer.name}`}
            className={`${styles.layerHandle} ${styles.resizeHandle}`}
            onPointerDown={(event) => beginInteraction(event, "resize")}
            type="button"
          />
        </>
      ) : null}
    </div>
  );
});
