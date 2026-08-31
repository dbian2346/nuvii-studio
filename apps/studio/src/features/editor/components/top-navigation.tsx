import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import type { SaveStatus } from "../hooks/use-editor";
import styles from "./editor.module.css";

const iconRoot = "/icons/nuvii";

interface TopNavigationProps {
  canRedo: boolean;
  canUndo: boolean;
  exporting: boolean;
  onExport: () => void;
  onRedo: () => void;
  onSave: () => void;
  onUndo: () => void;
  saveError: string;
  saveStatus: SaveStatus;
}

const SAVE_LABELS: Readonly<Record<SaveStatus, string>> = {
  loading: "Opening project…",
  saving: "Saving…",
  saved: "Saved locally",
  error: "Save unavailable",
};

export function TopNavigation({
  canRedo,
  canUndo,
  exporting,
  onExport,
  onRedo,
  onSave,
  onUndo,
  saveError,
  saveStatus,
}: TopNavigationProps) {
  return (
    <header className={styles.topbar}>
      <p className={styles.wordmark}>NUVII STUDIO</p>

      <div className={styles.topbarActions}>
        <span
          aria-live={saveStatus === "error" ? "assertive" : "polite"}
          className={styles.saveStatus}
          role={saveStatus === "error" ? "alert" : "status"}
          title={saveError || undefined}
        >
          {SAVE_LABELS[saveStatus]}
        </span>
        <IconButton
          aria-label="Undo"
          className={styles.undoButton}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Icon size="medium" src={`${iconRoot}/undo.svg`} />
        </IconButton>
        <IconButton
          aria-label="Redo"
          className={styles.redoButton}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Icon size="medium" src={`${iconRoot}/redo.svg`} />
        </IconButton>
        <Button
          className={styles.saveButton}
          disabled={saveStatus === "loading"}
          onClick={onSave}
          size="compact"
        >
          Save
        </Button>
        <Button
          className={styles.exportButton}
          loading={exporting}
          onClick={onExport}
          size="compact"
        >
          {exporting ? "Exporting…" : "Export"}
        </Button>
        <span aria-label="Nuvii profile" className={styles.profile} role="img">
          <Icon size="large" src={`${iconRoot}/person.svg`} />
        </span>
      </div>
    </header>
  );
}
