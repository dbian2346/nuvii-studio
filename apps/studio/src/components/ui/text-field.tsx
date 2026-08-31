import type { InputHTMLAttributes } from "react";
import { classNames } from "./class-names";
import styles from "./text-field.module.css";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  error?: string;
  hint?: string;
  id: string;
  label: string;
}

export function TextField({
  "aria-describedby": ariaDescribedBy,
  className,
  error,
  hint,
  id,
  label,
  ...props
}: TextFieldProps) {
  const descriptionIds = [
    ariaDescribedBy,
    hint ? `${id}-hint` : undefined,
    error ? `${id}-error` : undefined,
  ].filter((value): value is string => Boolean(value));

  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input
        {...props}
        aria-describedby={descriptionIds.length ? descriptionIds.join(" ") : undefined}
        aria-invalid={error ? true : undefined}
        className={classNames(styles.input, className)}
        id={id}
      />
      {hint ? <span className={styles.hint} id={`${id}-hint`}>{hint}</span> : null}
      {error ? <span className={styles.error} id={`${id}-error`}>{error}</span> : null}
    </label>
  );
}
