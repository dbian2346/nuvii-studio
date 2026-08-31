import { memo, useId, type CSSProperties } from "react";
import { AssetArtwork } from "@/features/editor/components/asset-artwork";
import { ASSET_BY_ID } from "@/features/editor/domain/asset-data";
import {
  LEFT_HAND,
  LENGTH_HEIGHTS,
  RIGHT_HAND,
  SHAPE_PATHS,
} from "@/features/editor/domain/editor-data";
import type { EditorProject, Nail, NailLayer } from "@/features/editor/domain/types";
import styles from "./projects.module.css";

type NailStyle = CSSProperties & { "--preview-nail-height": string };
type LayerStyle = CSSProperties & {
  "--preview-layer-height": string;
  "--preview-layer-left": string;
  "--preview-layer-opacity": number;
  "--preview-layer-rotation": string;
  "--preview-layer-top": string;
  "--preview-layer-width": string;
};

function PreviewLayer({ layer }: { layer: NailLayer }) {
  const asset = ASSET_BY_ID.get(layer.assetId);
  if (!asset && !layer.imageData) return null;
  const style: LayerStyle = {
    "--preview-layer-height": `${(layer.height / 180) * 100}%`,
    "--preview-layer-left": `${layer.x}%`,
    "--preview-layer-opacity": layer.opacity,
    "--preview-layer-rotation": `${layer.rotation}deg`,
    "--preview-layer-top": `${(layer.y / 180) * 100}%`,
    "--preview-layer-width": `${layer.width}%`,
  };
  return (
    <span className={styles.previewLayer} style={style}>
      {asset ? <AssetArtwork asset={asset} color={layer.color} /> : (
        <svg aria-hidden="true" viewBox="0 0 100 180">
          <image height="180" href={layer.imageData} preserveAspectRatio="xMidYMid slice" width="100" />
        </svg>
      )}
    </span>
  );
}

function PreviewNail({ nail }: { nail: Nail }) {
  const rawId = useId().replaceAll(":", "");
  const style: NailStyle = {
    "--preview-nail-height": `${Math.round(LENGTH_HEIGHTS[nail.length] * 0.34)}px`,
  };
  const path = SHAPE_PATHS[nail.shape];
  return (
    <span className={styles.previewNail} style={style}>
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 180">
        <defs>
          <linearGradient id={`${rawId}-shine`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="0.42" stopColor={nail.baseColor} stopOpacity="0.14" />
            <stop offset="1" stopColor="#bdaaad" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path d={path} fill={nail.baseColor} />
        {nail.finish === "glossy" ? (
          <path d={path} fill={`url(#${rawId}-shine)`} />
        ) : null}
        {nail.finish === "chrome" ? (
          <path d={path} fill="#ffffff" opacity="0.28" />
        ) : null}
        {nail.finish === "glitter" ? (
          <path d={path} fill="#ffffff" opacity="0.34" />
        ) : null}
        {nail.finish === "jelly" ? (
          <path d={path} fill="#ffffff" opacity="0.2" />
        ) : null}
      </svg>
      <span className={styles.previewLayerStack}>
        {nail.layers.map((layer) => <PreviewLayer key={layer.id} layer={layer} />)}
      </span>
    </span>
  );
}

export const ProjectPreview = memo(function ProjectPreview({
  project,
}: {
  project: EditorProject;
}) {
  return (
    <div aria-hidden="true" className={styles.projectPreview}>
      {[RIGHT_HAND, LEFT_HAND].map((hand, index) => (
        <div className={styles.previewHand} key={index}>
          {hand.map((definition) => (
            <PreviewNail key={definition.id} nail={project.nails[definition.id]} />
          ))}
        </div>
      ))}
    </div>
  );
});
