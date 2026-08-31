"use client";

import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import styles from "./projects.module.css";

interface DialogFrameProps {
  children: ReactNode;
  descriptionId: string;
  onClose: () => void;
  returnFocusTo: HTMLElement | null;
  titleId: string;
}

function DialogFrame({
  children,
  descriptionId,
  onClose,
  returnFocusTo,
  titleId,
}: DialogFrameProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const handleDialogKeyDown = useDialogFocus({
    dialogRef: panelRef,
    onEscape: onClose,
    returnFocusTo,
  });

  return (
    <div className={styles.dialogBackdrop}>
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={handleDialogKeyDown}
        ref={panelRef}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

interface ProjectNameDialogProps {
  initialName?: string;
  mode: "create" | "rename";
  onClose: () => void;
  onSubmit: (name: string) => void;
  returnFocusTo: HTMLElement | null;
}

export function ProjectNameDialog({
  initialName = "",
  mode,
  onClose,
  onSubmit,
  returnFocusTo,
}: ProjectNameDialogProps) {
  const [name, setName] = useState(initialName);
  const id = useId();
  const title = mode === "create" ? "Create a new nail set" : "Rename project";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    onSubmit(cleanName);
  }

  return (
    <DialogFrame
      descriptionId={`${id}-description`}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      titleId={`${id}-title`}
    >
      <form className={styles.dialogForm} onSubmit={submit}>
        <div>
          <p className={styles.dialogEyebrow}>Nuvii Studio</p>
          <h2 id={`${id}-title`}>{title}</h2>
          <p id={`${id}-description`}>
            {mode === "create"
              ? "Start from a clean ten-nail set. You can shape and style every nail in the editor."
              : "Choose a concise name that makes this set easy to find."}
          </p>
        </div>
        <TextField
          autoComplete="off"
          id={`${id}-name`}
          label="Project name"
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          placeholder="Untitled nail set"
          value={name}
        />
        <div className={styles.dialogActions}>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button disabled={!name.trim()} type="submit" variant="accent">
            {mode === "create" ? "Create Project" : "Save Name"}
          </Button>
        </div>
      </form>
    </DialogFrame>
  );
}

interface DeleteProjectDialogProps {
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  returnFocusTo: HTMLElement | null;
}

export function DeleteProjectDialog({
  name,
  onClose,
  onConfirm,
  returnFocusTo,
}: DeleteProjectDialogProps) {
  const id = useId();
  return (
    <DialogFrame
      descriptionId={`${id}-description`}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      titleId={`${id}-title`}
    >
      <div className={styles.dialogForm}>
        <div>
          <p className={styles.dialogEyebrow}>Delete project</p>
          <h2 id={`${id}-title`}>Remove “{name}”?</h2>
          <p id={`${id}-description`}>
            This permanently removes the locally saved nail set from this browser.
          </p>
        </div>
        <div className={styles.dialogActions}>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button className={styles.dangerButton} onClick={onConfirm}>Delete Project</Button>
        </div>
      </div>
    </DialogFrame>
  );
}
