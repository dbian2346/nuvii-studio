"use client";

import { useEffect } from "react";
import styles from "./error.module.css";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <section className={styles.card} role="alert">
        <p className={styles.eyebrow}>Nuvii Studio</p>
        <h1>The studio hit a snag</h1>
        <p>Your saved projects are still safe. Retry this screen, or reopen the project library if the problem continues.</p>
        <button onClick={reset} type="button">Retry screen</button>
      </section>
    </main>
  );
}
