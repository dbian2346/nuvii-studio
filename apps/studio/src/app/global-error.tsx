"use client";

import { useEffect } from "react";
import styles from "./error.module.css";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className={styles.page}>
          <section className={styles.card} role="alert">
            <p className={styles.eyebrow}>Nuvii Studio</p>
            <h1>Nuvii could not open</h1>
            <p>Your local projects have not been changed. Retry the app to restore the workspace.</p>
            <button onClick={reset} type="button">Retry Nuvii Studio</button>
          </section>
        </main>
      </body>
    </html>
  );
}
