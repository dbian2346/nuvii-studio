"use client";

import {
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

interface UseDialogFocusOptions {
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape: () => void | Promise<void>;
  returnFocusTo: HTMLElement | null;
}

export function useDialogFocus({
  dialogRef,
  initialFocusRef,
  onEscape,
  returnFocusTo,
}: UseDialogFocusOptions) {
  useEffect(() => {
    const previous = returnFocusTo ?? (
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    const initialFocus = initialFocusRef?.current
      ?? dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    initialFocus?.focus();

    return () => {
      window.setTimeout(() => previous?.focus(), 0);
    };
  }, [dialogRef, initialFocusRef, returnFocusTo]);

  return function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      void onEscape();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => element.tabIndex >= 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
