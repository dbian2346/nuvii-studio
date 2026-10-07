import { memo, useId, type CSSProperties } from "react";
import { LENGTH_HEIGHTS, SHAPE_PATHS } from "../domain/editor-data";
import type { Nail, NailLayerPatch, NailShape } from "../domain/types";
import { PlacedLayer } from "./placed-layer";
import styles from "./editor.module.css";

type NailStyle = CSSProperties & { "--nail-height": string };

interface NailSurfaceProps {
  nail: Nail;
  onFocus?: (nailId: Nail["id"]) => void;
  onSelect: (nailId: Nail["id"]) => void;
  onSelectLayer: (nailId: Nail["id"], layerId: string) => void;
  onUpdateLayer: (nailId: Nail["id"], layerId: string, patch: NailLayerPatch) => void;
  presentation?: "canvas" | "focus";
  selected: boolean;
  selectedLayerId: string | null;
}

export const NailSurface = memo(function NailSurface({
  nail,
  onFocus,
  onSelect,
  onSelectLayer,
  onUpdateLayer,
  presentation = "canvas",
  selected,
  selectedLayerId,
}: NailSurfaceProps) {
  const rawId = useId();
  const id = rawId.replaceAll(":", "");
  const path = SHAPE_PATHS[nail.shape];
  const heightScale = presentation === "focus" ? 2.15 : 1;
  const style: NailStyle = {
    "--nail-height": `${LENGTH_HEIGHTS[nail.length] * heightScale}px`,
  };

  return (
    <div
      className={`${styles.nailSurface} ${presentation === "focus" ? styles.focusNailSurface : ""}`}
      data-nail-presentation={presentation}
      data-nail-surface
      style={style}
    >
      <button
        aria-label={`Select ${nail.hand} ${nail.label}`}
        aria-pressed={selected}
        className={styles.nailButton}
        data-nail-id={nail.id}
        onClick={() => onSelect(nail.id)}
        onDoubleClick={() => onFocus?.(nail.id)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className={styles.nailSvg}
          preserveAspectRatio="none"
          viewBox="0 0 100 180"
        >
          <defs>
          <clipPath id={`${id}-clip`}>
            <path d={path} />
          </clipPath>
          <linearGradient id={`${id}-gloss`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.76" />
            <stop offset="0.28" stopColor={nail.baseColor} stopOpacity="0.22" />
            <stop offset="0.63" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#d9c7c2" stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id={`${id}-chrome`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.25" stopColor={nail.baseColor} />
            <stop offset="0.48" stopColor="#77727a" />
            <stop offset="0.7" stopColor="#ffffff" />
            <stop offset="1" stopColor={nail.baseColor} />
          </linearGradient>
          <pattern
            height="20"
            id={`${id}-glitter`}
            patternUnits="userSpaceOnUse"
            width="20"
          >
            <circle cx="4" cy="5" fill="#ffffff" r="1.6" />
            <circle cx="14" cy="12" fill="#fff8d7" r="1.2" />
            <circle cx="8" cy="18" fill="#ffffff" r="0.8" />
          </pattern>
          </defs>

          <g transform="translate(50 90) scale(1.22 1) translate(-50 -90)">
          <path
            className={styles.nailBase}
            d={path}
            fill={nail.baseColor}
            vectorEffect="non-scaling-stroke"
          />
          {nail.finish === "chrome" ? (
            <path d={path} fill={`url(#${id}-chrome)`} opacity="0.72" />
          ) : null}
          {nail.finish === "glitter" ? (
            <path d={path} fill={`url(#${id}-glitter)`} opacity="0.8" />
          ) : null}
          {nail.finish === "jelly" ? (
            <path d={path} fill="#ffffff" opacity="0.22" />
          ) : null}
          {nail.finish === "glossy" ? (
            <>
              <path d={path} fill={`url(#${id}-gloss)`} />
              <path
                clipPath={`url(#${id}-clip)`}
                d="M31 27 C25 68 27 119 38 151"
                fill="none"
                opacity="0.52"
                stroke="#ffffff"
                strokeLinecap="round"
                strokeWidth="7"
              />
            </>
          ) : null}
          {selected ? (
            <path
              className={styles.nailSelection}
              d={path}
              fill="none"
              transform="translate(50 90) scale(1.065 1.045) translate(-50 -90)"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          </g>
        </svg>
      </button>

      <div className={styles.nailLayerStack} data-nail-layer-stack>
        {nail.layers.map((layer) => (
          <PlacedLayer
            key={layer.id}
            layer={layer}
            nailId={nail.id}
            nailShape={nail.shape}
            onCommit={onUpdateLayer}
            onSelect={onSelectLayer}
            selected={selected && selectedLayerId === layer.id}
          />
        ))}
      </div>
    </div>
  );
});

export function ShapeGlyph({ shape }: { shape: NailShape }) {
  return (
    <svg aria-hidden="true" className={styles.shapeGlyph} viewBox="0 0 100 180">
      <path d={SHAPE_PATHS[shape]} />
    </svg>
  );
}
