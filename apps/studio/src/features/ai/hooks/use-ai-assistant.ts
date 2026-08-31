"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Nail } from "@/features/editor/domain/types";
import type { NailSetSpec, RenderStrategy } from "@/lib/nuvii-ai";
import type {
  AiAppliedSummary,
  AiQualityMode,
  AiRunKind,
  AiSmartResult,
} from "../domain/types";
import {
  AiRequestError,
  localAiServiceIsReady,
  requestEditableSet,
  requestSmartGeneration,
} from "../services/ai-client";
import type { AiRequestInput } from "../services/ai-client";

type AiAssistantState =
  | { status: "idle" }
  | { kind: AiRunKind; progress: string; status: "loading" }
  | {
      interpretationSource: "local" | "openai";
      mode: RenderStrategy;
      spec: NailSetSpec;
      status: "candidates";
      result: AiSmartResult;
    }
  | {
      interpretationSource: "local" | "openai";
      mode: RenderStrategy;
      spec: NailSetSpec;
      status: "success";
      summary: AiAppliedSummary;
    }
  | { kind: AiRunKind; message: string; status: "error" };

interface UseAiAssistantOptions {
  nail: Nail;
  onApply: (spec: NailSetSpec, generatedImage?: string) => AiAppliedSummary;
  prompt: string;
  referenceImage?: string;
}

type RetrySnapshot =
  | { input: AiRequestInput; kind: "editable" }
  | { input: AiRequestInput; kind: "smart"; quality: AiQualityMode };

const EDITABLE_STAGES = [
  [450, "Matching native Nuvii assets"],
  [1_200, "Building editable layers"],
] as const;

const SMART_STAGES = [
  [700, "Preparing the nail model"],
  [2_500, "Rendering candidates"],
  [10_000, "Evaluating prompt adherence"],
] as const;

export function useAiAssistant({
  nail,
  onApply,
  prompt,
  referenceImage,
}: UseAiAssistantOptions) {
  const [state, setState] = useState<AiAssistantState>({ status: "idle" });
  const [quality, setQuality] = useState<AiQualityMode>("balanced");
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const activeRequest = useRef<AbortController | null>(null);
  const lastRequest = useRef<RetrySnapshot | null>(null);

  const clearProgress = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  useEffect(() => () => {
    clearProgress();
    activeRequest.current?.abort();
  }, [clearProgress]);

  const startProgress = useCallback((kind: AiRunKind) => {
    clearProgress();
    setState({ kind, progress: "Interpreting your design brief", status: "loading" });
    const stages = kind === "editable" ? EDITABLE_STAGES : SMART_STAGES;
    timers.current = stages.map(([delay, progress]) => window.setTimeout(() => {
      setState((current) => current.status === "loading" && current.kind === kind
        ? { ...current, progress }
        : current);
    }, delay));
  }, [clearProgress]);

  const requestInput = useCallback(() => ({
    nail,
    prompt: prompt.trim(),
    referenceImage,
  }), [nail, prompt, referenceImage]);

  const fail = useCallback((kind: AiRunKind, error: unknown) => {
    clearProgress();
    const fallback = kind === "editable"
      ? "Nuvii couldn't interpret this prompt. Your current design was not changed. Retry, or rephrase the brief with specific colours and artwork."
      : "Nuvii couldn't generate artwork. Your current design was not changed. Retry, or use Build Editable Set instead.";
    setState({
      kind,
      message: error instanceof AiRequestError ? error.message : fallback,
      status: "error",
    });
  }, [clearProgress]);

  const runEditableSet = useCallback(async (input: AiRequestInput) => {
    startProgress("editable");
    const controller = new AbortController();
    activeRequest.current?.abort();
    activeRequest.current = controller;
    try {
      const result = await requestEditableSet(input, controller.signal);
      if (controller.signal.aborted) return;
      const summary = onApply(result.spec);
      clearProgress();
      setState({
        interpretationSource: result.source,
        mode: result.spec.strategy,
        spec: result.spec,
        status: "success",
        summary,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      fail("editable", error);
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [clearProgress, fail, onApply, startProgress]);

  const runSmartGeneration = useCallback(async (
    input: AiRequestInput,
    qualityMode: AiQualityMode,
    recheckHealth = false,
  ) => {
    startProgress("smart");
    const controller = new AbortController();
    activeRequest.current?.abort();
    activeRequest.current = controller;
    try {
      if (recheckHealth && !await localAiServiceIsReady(controller.signal)) {
        throw new AiRequestError(
          "The local AI design service isn't running. Your current design was not changed. Start the local inference service, then choose Retry.",
          "service",
        );
      }
      const result = await requestSmartGeneration(input, qualityMode, controller.signal);
      if (controller.signal.aborted) return;
      clearProgress();
      if (result.mode === "library") {
        const summary = onApply(result.spec);
        setState({
          interpretationSource: result.interpretationSource,
          mode: result.mode,
          spec: result.spec,
          status: "success",
          summary,
        });
        return;
      }
      if (!result.candidates.length) {
        throw new AiRequestError(
          "The nail model returned no artwork candidates. Your current design was not changed. Choose Retry, or use Build Editable Set instead.",
          "generation",
        );
      }
      const recommended = result.candidates.find((candidate) => candidate.recommended);
      setSelectedCandidate(recommended?.index ?? result.candidates[0].index);
      setState({
        interpretationSource: result.interpretationSource,
        mode: result.mode,
        result,
        spec: result.spec,
        status: "candidates",
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      fail("smart", error);
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, [clearProgress, fail, onApply, startProgress]);

  const buildEditableSet = useCallback(async () => {
    if (!prompt.trim()) {
      setState({
        kind: "editable",
        message: "No design brief was provided. Your current design was not changed. Describe the colours and artwork you want, then try again.",
        status: "error",
      });
      return;
    }
    const input = requestInput();
    lastRequest.current = { input, kind: "editable" };
    await runEditableSet(input);
  }, [prompt, requestInput, runEditableSet]);

  const smartGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setState({
        kind: "smart",
        message: "No design brief was provided. Your current design was not changed. Describe the novel artwork you want, then try again.",
        status: "error",
      });
      return;
    }
    const input = requestInput();
    lastRequest.current = { input, kind: "smart", quality };
    await runSmartGeneration(input, quality);
  }, [prompt, quality, requestInput, runSmartGeneration]);

  const applyCandidate = useCallback(() => {
    if (state.status !== "candidates" || selectedCandidate === null) return;
    const candidate = state.result.candidates.find((item) => item.index === selectedCandidate);
    if (!candidate) return;
    const summary = onApply(state.spec, candidate.dataURI);
    setState({
      interpretationSource: state.interpretationSource,
      mode: state.mode,
      spec: state.spec,
      status: "success",
      summary,
    });
  }, [onApply, selectedCandidate, state]);

  const retry = useCallback(() => {
    if (state.status !== "error") return;
    const snapshot = lastRequest.current;
    if (!snapshot || snapshot.kind !== state.kind) return;
    if (snapshot.kind === "editable") void runEditableSet(snapshot.input);
    else void runSmartGeneration(snapshot.input, snapshot.quality, true);
  }, [runEditableSet, runSmartGeneration, state]);

  const resetResult = useCallback(() => {
    clearProgress();
    setSelectedCandidate(null);
    setState({ status: "idle" });
  }, [clearProgress]);

  return {
    applyCandidate,
    buildEditableSet,
    quality,
    resetResult,
    retry,
    selectedCandidate,
    setQuality,
    setSelectedCandidate,
    smartGenerate,
    state,
  };
}
