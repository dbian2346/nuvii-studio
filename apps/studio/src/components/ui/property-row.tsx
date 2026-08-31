import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./property-row.module.css";

export interface PropertyRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  selected?: boolean;
}

export function PropertyRow({
  className,
  icon,
  label,
  selected = false,
  type = "button",
  ...props
}: PropertyRowProps) {
  return (
    <button
      {...props}
      aria-pressed={selected}
      className={classNames(styles.row, selected && styles.selected, className)}
      type={type}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
