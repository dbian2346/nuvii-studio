import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./color-swatch.module.css";

type SwatchStyle = CSSProperties & { "--nuvii-swatch-color": string };

export interface ColorSwatchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  "aria-label": string;
  color?: string;
  icon?: ReactNode;
  selected?: boolean;
}

export function ColorSwatch({
  "aria-label": ariaLabel,
  className,
  color = "transparent",
  icon,
  selected = false,
  type = "button",
  ...props
}: ColorSwatchProps) {
  const swatchStyle: SwatchStyle = { "--nuvii-swatch-color": color };

  return (
    <button
      {...props}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={classNames(styles.swatch, Boolean(icon) && styles.add, selected && styles.selected, className)}
      style={swatchStyle}
      type={type}
    >
      {icon}
    </button>
  );
}
