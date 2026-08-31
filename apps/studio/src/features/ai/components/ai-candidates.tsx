import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { AiCandidate } from "../domain/types";
import styles from "./ai-assistant.module.css";

function candidateLabel(candidate: AiCandidate): string {
  const details = [
    candidate.checkpoint ? `Checkpoint ${candidate.checkpoint}` : null,
    candidate.qualityScore === null
      ? null
      : `score ${Math.round(candidate.qualityScore)}`,
  ].filter(Boolean);
  return details.join(" · ") || `Candidate ${candidate.index + 1}`;
}

interface AiCandidatesProps {
  candidates: readonly AiCandidate[];
  message: string;
  onApply: () => void;
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

export function AiCandidates({
  candidates,
  message,
  onApply,
  onSelect,
  selectedIndex,
}: AiCandidatesProps) {
  return (
    <section aria-labelledby="ai-candidates-title" className={styles.candidateSection}>
      <div className={styles.resultHeading}>
        <div>
          <p className={styles.eyebrow}>Image model result</p>
          <h3 id="ai-candidates-title">Choose artwork</h3>
        </div>
        <span>{candidates.length} option{candidates.length === 1 ? "" : "s"}</span>
      </div>
      <p className={styles.resultMessage}>{message}</p>
      <div className={styles.candidateGrid}>
        {candidates.map((candidate) => {
          const selected = selectedIndex === candidate.index;
          return (
            <button
              aria-label={`Select candidate ${candidate.index + 1}${candidate.recommended ? ", Nuvii recommended" : ""}`}
              aria-pressed={selected}
              className={styles.candidateCard}
              key={candidate.index}
              onClick={() => onSelect(candidate.index)}
              type="button"
            >
              <span className={styles.candidateImage}>
                <Image
                  alt={`Generated nail artwork candidate ${candidate.index + 1}`}
                  fill
                  sizes="140px"
                  src={candidate.dataURI}
                  unoptimized
                />
                {candidate.recommended ? <span className={styles.recommendedBadge}>Recommended</span> : null}
              </span>
              <span className={styles.candidateMeta}>
                <strong>Option {candidate.index + 1}</strong>
                <span>{candidateLabel(candidate)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <Button disabled={selectedIndex === null} onClick={onApply} variant="accent">
        Apply Selected Candidate
      </Button>
      <p className={styles.candidateNote}>
        Generated artwork becomes one movable image layer. Matched Nuvii assets remain separate and editable.
      </p>
    </section>
  );
}
