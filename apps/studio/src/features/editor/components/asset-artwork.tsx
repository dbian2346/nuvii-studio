import { memo, useId } from "react";
import type {
  AssetDefinition,
  AssetPaint,
  AssetVectorElement,
} from "../domain/types";
import styles from "./editor.module.css";

interface AssetArtworkProps {
  asset: AssetDefinition;
  color?: string;
  label?: string;
}

function resolvePaint(
  paint: AssetPaint | undefined,
  primary: string,
  secondary: string,
  metallicId: string | null,
): string | undefined {
  if (!paint) return undefined;
  if (paint === "none") return "none";
  if (paint === "white") return "#ffffff";
  if (paint === "secondary") return secondary;
  return metallicId ? `url(#${metallicId})` : primary;
}

function VectorElement({
  element,
  metallicId,
  primary,
  secondary,
}: {
  element: AssetVectorElement;
  metallicId: string | null;
  primary: string;
  secondary: string;
}) {
  const common = {
    fill: resolvePaint(element.fill, primary, secondary, metallicId),
    opacity: element.opacity,
    stroke: resolvePaint(element.stroke, primary, secondary, metallicId),
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: element.strokeWidth,
  };

  switch (element.type) {
    case "path":
      return <path {...common} d={element.d} />;
    case "circle":
      return <circle {...common} cx={element.cx} cy={element.cy} r={element.r} />;
    case "ellipse":
      return (
        <ellipse
          {...common}
          cx={element.cx}
          cy={element.cy}
          rx={element.rx}
          ry={element.ry}
        />
      );
    case "line":
      return (
        <line
          {...common}
          x1={element.x1}
          x2={element.x2}
          y1={element.y1}
          y2={element.y2}
        />
      );
  }
}

export const AssetArtwork = memo(function AssetArtwork({
  asset,
  color = asset.defaultColor,
  label,
}: AssetArtworkProps) {
  const gradientId = useId().replaceAll(":", "");
  const metallicId = asset.metallic ? `metal-${gradientId}` : null;

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={styles.assetArtwork}
      role={label ? "img" : undefined}
      viewBox="0 0 100 100"
    >
      {metallicId ? (
        <defs>
          <linearGradient id={metallicId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.22" stopColor={color} />
            <stop offset="0.48" stopColor={asset.metallic === "gold" ? "#745c2b" : "#676b74"} />
            <stop offset="0.72" stopColor="#ffffff" />
            <stop offset="1" stopColor={color} />
          </linearGradient>
        </defs>
      ) : null}
      {asset.elements.map((element, index) => (
        <VectorElement
          element={element}
          key={`${asset.id}-${index}`}
          metallicId={metallicId}
          primary={color}
          secondary={asset.secondaryColor}
        />
      ))}
    </svg>
  );
});
