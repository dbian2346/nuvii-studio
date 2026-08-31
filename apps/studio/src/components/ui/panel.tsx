import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./panel.module.css";

type PanelVariant = "glass" | "solid";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  variant?: PanelVariant;
}

export function Panel({
  children,
  className,
  variant = "glass",
  ...props
}: PanelProps) {
  return (
    <section {...props} className={classNames(styles.panel, styles[variant], className)}>
      {children}
    </section>
  );
}
