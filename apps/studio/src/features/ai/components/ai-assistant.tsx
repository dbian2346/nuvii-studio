"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Nail } from "@/features/editor/domain/types";
import type { NailSetSpec } from "@/lib/nuvii-ai";
import type { AiAppliedSummary, AiQualityMode } from "../domain/types";
import { useAiAssistant } from "../hooks/use-ai-assistant";
import { AiCandidates } from "./ai-candidates";
import editorStyles from "@/features/editor/components/editor.module.css";
import styles from "./ai-assistant.module.css";

const EXAMPLES = [
  "Blush French tips with pearls",
  "Lavender aura with silver chrome",
  "Coquette bows and rhinestones",
] as const;

const QUALITY_OPTIONS: readonly { label: string; value: AiQualityMode; detail: string }[] = [
  { label: "Fast", value: "fast", detail: "1 candidate" },
  { label: "Balanced", value: "balanced", detail: "2 candidates" },
  { label: "Quality", value: "quality", detail: "3 candidates" },
] as const;

interface ReferenceImage {
  dataURI: string;
  name: string;
}

interface AiAssistantProps {
  nail: Nail;
  onApply: (spec: NailSetSpec, generatedImage?: string) => AiAppliedSummary;
  onViewLayers: () => void;
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("The reference image could not be read."));
    reader.onerror = () => reject(new Error("The reference image could not be read."));
    reader.readAsDataURL(file);
  });
}

export function AiAssistant({ nail, onApply, onViewLayers }: AiAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [reference, setReference] = useState<ReferenceImage | null>(null);
  const [referenceError, setReferenceError] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const {
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
  } = useAiAssistant({
    nail,
    onApply,
    prompt,
    referenceImage: reference?.dataURI,
  });
  const busy = state.status === "loading" || referenceLoading;

  function updatePrompt(value: string) {
    setPrompt(value);
    if (state.status !== "idle" && state.status !== "loading") resetResult();
  }

  async function selectReference(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setReferenceError(
        "Nuvii couldn't use that reference. Your design is safe. Choose a PNG, JPEG, or WebP image.",
      );
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setReferenceError(
        "Nuvii couldn't use that reference because it is larger than 4 MB. Your design is safe. Choose a smaller image and try again.",
      );
      return;
    }
    setReferenceLoading(true);
    try {
      setReference({ dataURI: await readImage(file), name: file.name });
      setReferenceError("");
      resetResult();
    } catch {
      setReferenceError(
        "Nuvii couldn't read that reference image. Your design is safe. Try another PNG, JPEG, or WebP image under 4 MB.",
      );
    } finally {
      setReferenceLoading(false);
    }
  }

  return (
    <aside aria-labelledby="ai-title" className={editorStyles.inspector}>
      <div className={editorStyles.inspectorHeader}>
        <Icon size="medium" src="/icons/nuvii/magic-wand.svg" />
        <div>
          <h2 id="ai-title">Nuvii AI</h2>
          <p>Design builder · {nail.label}</p>
        </div>
      </div>
      <div className={editorStyles.inspectorDivider} />

      <div className={styles.aiBody}>
        <section className={styles.briefSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Design brief</p>
            <span>{prompt.length}/600</span>
          </div>
          <label className={styles.promptField}>
            <span className={styles.visuallyHidden}>Describe a nail design</span>
            <textarea
              disabled={busy}
              maxLength={600}
              onChange={(event) => updatePrompt(event.target.value)}
              placeholder="Describe the colours, finish, shape, and artwork you want…"
              ref={promptRef}
              rows={5}
              value={prompt}
            />
          </label>
          <div aria-label="Prompt examples" className={styles.exampleChips}>
            {EXAMPLES.map((example) => (
              <button
                disabled={busy}
                key={example}
                onClick={() => updatePrompt(example)}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.referenceSection}>
          <div className={styles.referenceHeading}>
            <div>
              <strong>Reference image</strong>
              <span>Optional · used to interpret style and palette</span>
            </div>
            {reference ? (
              <Button
                disabled={busy}
                onClick={() => {
                  setReference(null);
                  resetResult();
                }}
                size="compact"
                variant="ghost"
              >
                Remove
              </Button>
            ) : null}
          </div>
          {reference ? (
            <div className={styles.referencePreview}>
              <Image alt={`Reference: ${reference.name}`} fill sizes="280px" src={reference.dataURI} unoptimized />
              <span>{reference.name}</span>
            </div>
          ) : (
            <label aria-busy={referenceLoading || undefined} className={styles.referencePicker}>
              <Icon size="medium" src="/icons/nuvii/upload.svg" />
              <span>{referenceLoading ? "Reading reference…" : "Add visual reference"}</span>
              <input
                accept="image/png,image/jpeg,image/webp"
                aria-describedby={referenceError ? "ai-reference-error" : undefined}
                aria-invalid={referenceError ? true : undefined}
                disabled={busy}
                onChange={selectReference}
                type="file"
              />
            </label>
          )}
          {referenceError ? (
            <p className={styles.referenceError} id="ai-reference-error" role="alert">
              {referenceError}
            </p>
          ) : null}
        </section>

        <div className={styles.methodStack}>
          <section className={styles.methodCard}>
            <div className={styles.methodTitle}>
              <span className={styles.nativeMark}><Icon size="small" src="/icons/nuvii/layers.svg" /></span>
              <div><strong>Editable Nuvii set</strong><span>Preferred for known artwork</span></div>
              <span className={styles.preferredBadge}>Preferred</span>
            </div>
            <p>Bows, pearls, French tips, aura, chrome, flowers, chains, and gems become native layers.</p>
            <Button
              disabled={busy || !prompt.trim()}
              loading={busy && state.status === "loading" && state.kind === "editable"}
              onClick={() => void buildEditableSet()}
              variant="accent"
            >
              Build Editable Set
            </Button>
          </section>

          <section className={`${styles.methodCard} ${styles.smartMethod}`}>
            <div className={styles.methodTitle}>
              <span className={styles.modelMark}><Icon size="small" src="/icons/nuvii/sparkle.svg" /></span>
              <div><strong>Smart Generate</strong><span>For novel visual artwork</span></div>
            </div>
            <p>Uses the Nuvii nail model only where native assets cannot express the request.</p>
            <fieldset className={styles.qualityControl} disabled={busy}>
              <legend>Image quality</legend>
              <div>
                {QUALITY_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input
                      checked={quality === option.value}
                      name="ai-quality"
                      onChange={() => setQuality(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              disabled={busy || !prompt.trim()}
              loading={busy && state.status === "loading" && state.kind === "smart"}
              onClick={() => void smartGenerate()}
            >
              Smart Generate
            </Button>
          </section>
        </div>

        {state.status === "loading" ? (
          <div aria-live="polite" className={styles.progressCard} role="status">
            <span className={styles.progressIcon}><Icon size="medium" src="/icons/nuvii/magic-wand.svg" /></span>
            <div>
              <strong>{state.kind === "editable" ? "Building editable set" : "Creating artwork candidates"}</strong>
              <p>{state.progress}</p>
            </div>
            <span aria-hidden="true" className={styles.progressBar}><span /></span>
          </div>
        ) : null}

        {state.status === "success" ? (
          <section aria-live="polite" className={styles.successCard} role="status">
            <div className={styles.resultHeading}>
              <div>
                <p className={styles.eyebrow}>Applied to canvas</p>
                <h3>{state.summary.generatedLayerCount ? "Hybrid editable result" : "Native editable set"}</h3>
              </div>
              <span className={styles.strategyBadge}>{state.mode}</span>
            </div>
            <p>{state.spec.designSummary}</p>
            <div className={styles.resultStats}>
              <span><strong>{state.summary.nativeLayerCount}</strong> native layers</span>
              <span><strong>{state.summary.generatedLayerCount}</strong> generated layers</span>
            </div>
            {state.spec.novelConcepts.length && state.summary.generatedLayerCount === 0 ? (
              <p className={styles.resultNotice}>The editable foundation was applied. Use Smart Generate to render: {state.spec.novelConcepts.join(", ")}.</p>
            ) : null}
            <p className={styles.interpreterNote}>
              Interpreted by {state.interpretationSource === "openai" ? "Nuvii structured AI" : "Nuvii's local deterministic parser"}.
            </p>
            <div className={styles.resultActions}>
              <Button onClick={onViewLayers} size="compact">View Layers</Button>
              <Button
                onClick={() => {
                  resetResult();
                  promptRef.current?.focus();
                }}
                size="compact"
                variant="ghost"
              >
                Refine Brief
              </Button>
            </div>
          </section>
        ) : null}

        {state.status === "candidates" ? (
          <AiCandidates
            candidates={state.result.candidates}
            message={state.result.message}
            onApply={applyCandidate}
            onSelect={setSelectedCandidate}
            selectedIndex={selectedCandidate}
          />
        ) : null}

        {state.status === "error" ? (
          <section className={styles.errorCard} role="alert">
            <span aria-hidden="true">!</span>
            <div><strong>Design not changed</strong><p>{state.message}</p></div>
            <Button onClick={retry} size="compact">Retry</Button>
          </section>
        ) : null}

        <p className={styles.privacyNote}>
          Your design remains editable. Reference images are sent only when you run an AI action; credentials stay on the server.
        </p>
      </div>
    </aside>
  );
}
