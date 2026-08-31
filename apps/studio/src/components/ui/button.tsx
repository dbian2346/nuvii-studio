import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./button.module.css";

type ButtonVariant = "accent" | "surface" | "ghost";
type ButtonSize = "compact" | "default";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  size = "default",
  type = "button",
  variant = "surface",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classNames(styles.button, styles[variant], styles[size], className)}
      disabled={disabled || loading}
      type={type}
    >
      {children}
    </button>
  );
}
