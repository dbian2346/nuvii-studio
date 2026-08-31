import { Icon } from "@/components/ui/icon";
import type { Nail, NailLayerPatch } from "../domain/types";
import { LayerControls, LayerList } from "./layer-stack";
import styles from "./editor.module.css";

const iconRoot = "/icons/nuvii";

interface LayersPanelProps {
  nail: Nail;
  onDelete: (layerId: string) => void;
  onDuplicate: (layerId: string) => void;
  onMove: (layerId: string, direction: "forward" | "backward") => void;
  onSelect: (layerId: string) => void;
  onUpdate: (layerId: string, patch: NailLayerPatch) => void;
  selectedLayerId: string | null;
}

export function LayersPanel({
  nail,
  onDelete,
  onDuplicate,
  onMove,
  onSelect,
  onUpdate,
  selectedLayerId,
}: LayersPanelProps) {
  return (
    <aside aria-labelledby="layers-title" className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <Icon size="medium" src={`${iconRoot}/layers.svg`} />
        <div>
          <h2 id="layers-title">Layers</h2>
          <p>
            {nail.layers.length} {nail.layers.length === 1 ? "layer" : "layers"} -{" "}
            {nail.label}
          </p>
        </div>
      </div>
      <div className={styles.inspectorDivider} />

      <div className={styles.layersPanelBody}>
        <LayerList
          nail={nail}
          onSelect={onSelect}
          selectedLayerId={selectedLayerId}
        />
        <LayerControls
          nail={nail}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMove={onMove}
          onUpdate={onUpdate}
          selectedLayerId={selectedLayerId}
        />
      </div>
    </aside>
  );
}
