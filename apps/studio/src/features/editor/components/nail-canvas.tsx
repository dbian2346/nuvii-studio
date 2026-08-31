import { LEFT_HAND, RIGHT_HAND } from "../domain/editor-data";
import type { EditorProject, NailId, NailLayerPatch } from "../domain/types";
import { NailSurface } from "./nail-surface";
import styles from "./editor.module.css";

interface NailCanvasProps {
  onFocusNail: (nailId: NailId) => void;
  onSelectNail: (nailId: NailId) => void;
  onSelectLayer: (nailId: NailId, layerId: string) => void;
  onUpdateLayer: (nailId: NailId, layerId: string, patch: NailLayerPatch) => void;
  project: EditorProject;
  selectedLayerId: string | null;
  selectedNailId: NailId;
}

export function NailCanvas({
  onFocusNail,
  onSelectNail,
  onSelectLayer,
  onUpdateLayer,
  project,
  selectedLayerId,
  selectedNailId,
}: NailCanvasProps) {
  return (
    <section aria-label="Ten-nail design canvas" className={styles.nailCanvas}>
      <span aria-hidden="true" className={`${styles.handLabel} ${styles.rightLabel}`}>
        R
      </span>
      <div className={styles.nailRow}>
        {RIGHT_HAND.map((definition) => (
          <NailSurface
            key={definition.id}
            nail={project.nails[definition.id]}
            onFocus={onFocusNail}
            onSelect={onSelectNail}
            onSelectLayer={onSelectLayer}
            onUpdateLayer={onUpdateLayer}
            selected={selectedNailId === definition.id}
            selectedLayerId={selectedNailId === definition.id ? selectedLayerId : null}
          />
        ))}
      </div>

      <span aria-hidden="true" className={`${styles.handLabel} ${styles.leftLabel}`}>
        L
      </span>
      <div className={styles.nailRow}>
        {LEFT_HAND.map((definition) => (
          <NailSurface
            key={definition.id}
            nail={project.nails[definition.id]}
            onFocus={onFocusNail}
            onSelect={onSelectNail}
            onSelectLayer={onSelectLayer}
            onUpdateLayer={onUpdateLayer}
            selected={selectedNailId === definition.id}
            selectedLayerId={selectedNailId === definition.id ? selectedLayerId : null}
          />
        ))}
      </div>
    </section>
  );
}
