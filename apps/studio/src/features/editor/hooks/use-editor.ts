"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  createInitialEditorState,
  editorReducer,
} from "../domain/editor-reducer";
import {
  readRecentAssetIds,
  writeRecentAssetIds,
} from "../services/project-storage";
import { createInitialProject } from "../domain/editor-data";
import { createPastedLayer } from "../domain/layer-clipboard";
import type { NailLayer } from "../domain/types";
import { createProjectsRepository } from "@/features/projects/services/local-projects-repository";

export type SaveStatus = "loading" | "saved" | "saving" | "error";

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function useEditor() {
  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    createInitialEditorState,
  );
  const hydrated = useRef(false);
  const skipNextAutosave = useRef(false);
  const copiedLayer = useRef<NailLayer | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [saveError, setSaveError] = useState("");
  const [shortcutNotice, setShortcutNotice] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const repository = createProjectsRepository(window.localStorage);
        const project = repository.ensureActive(createInitialProject).project;
        const recentAssetIds = readRecentAssetIds(window.localStorage);
        skipNextAutosave.current = true;
        dispatch({ type: "hydrate", project, recentAssetIds });
        setSaveError("");
        setSaveStatus("saved");
      } catch {
        setSaveError(
          "Nuvii couldn't open this project from browser storage. Your saved projects were not changed. Allow site storage, then reload the page.",
        );
        setSaveStatus("error");
      } finally {
        hydrated.current = true;
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const statusTimeout = window.setTimeout(() => setSaveStatus("saving"), 0);
    const timeout = window.setTimeout(() => {
      try {
        createProjectsRepository(window.localStorage).saveActive(state.project);
        writeRecentAssetIds(window.localStorage, state.recentAssetIds);
        setSaveError("");
        setSaveStatus("saved");
      } catch {
        setSaveError(
          "Nuvii couldn't save this project in browser storage. Your edits are still open in this tab. Keep the tab open, allow site storage, then choose Save again.",
        );
        setSaveStatus("error");
      }
    }, 350);

    return () => {
      window.clearTimeout(statusTimeout);
      window.clearTimeout(timeout);
    };
  }, [state.project, state.recentAssetIds]);

  const handleEditorShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;

    const key = event.key.toLowerCase();
    const commandKey = event.metaKey || event.ctrlKey;
    if (commandKey) {
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: "undo" });
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        dispatch({ type: "redo" });
      }
      return;
    }

    if (
      !event.repeat &&
      (event.key === "Delete" || event.key === "Backspace") &&
      state.selectedLayerId
    ) {
      const selectedNail = state.project.nails[state.selectedNailId];
      const selectedLayer = selectedNail.layers.find(
        (layer) => layer.id === state.selectedLayerId,
      );
      if (!selectedLayer) return;
      event.preventDefault();
      dispatch({
        type: "delete-layer",
        nailId: state.selectedNailId,
        layerId: selectedLayer.id,
      });
      setShortcutNotice(`${selectedLayer.name} deleted. Undo is available.`);
    }
  });

  const handleCopy = useEffectEvent((event: ClipboardEvent) => {
    if (isEditableTarget(event.target)) return;
    const selectedNail = state.project.nails[state.selectedNailId];
    const selectedLayer = selectedNail.layers.find(
      (layer) => layer.id === state.selectedLayerId,
    );
    if (!selectedLayer) return;
    event.preventDefault();
    copiedLayer.current = { ...selectedLayer };
    event.clipboardData?.setData("text/plain", `Nuvii layer: ${selectedLayer.name}`);
    setShortcutNotice(`${selectedLayer.name} copied in Nuvii.`);
  });

  const handlePaste = useEffectEvent((event: ClipboardEvent) => {
    if (isEditableTarget(event.target) || !copiedLayer.current) return;
    event.preventDefault();
    const selectedNail = state.project.nails[state.selectedNailId];
    const layer = createPastedLayer(copiedLayer.current, crypto.randomUUID());
    dispatch({ type: "add-layer", layer });
    setShortcutNotice(`${layer.name} pasted onto ${selectedNail.label}.`);
  });

  useEffect(() => {
    window.addEventListener("keydown", handleEditorShortcut);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleEditorShortcut);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  useEffect(() => {
    if (!shortcutNotice) return;
    const timeout = window.setTimeout(() => setShortcutNotice(""), 4_000);
    return () => window.clearTimeout(timeout);
  }, [shortcutNotice]);

  const saveNow = useCallback(() => {
    setSaveStatus("saving");
    try {
      createProjectsRepository(window.localStorage).saveActive(state.project);
      writeRecentAssetIds(window.localStorage, state.recentAssetIds);
      setSaveError("");
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveError(
        "Nuvii couldn't save this project in browser storage. Your edits are still open in this tab. Keep the tab open, allow site storage, then choose Save again.",
      );
      setSaveStatus("error");
      return false;
    }
  }, [state.project, state.recentAssetIds]);

  return {
    state,
    dispatch,
    saveNow,
    saveError,
    saveStatus,
    shortcutNotice,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
