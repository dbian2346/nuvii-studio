import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { classNames } from "./class-names";
import styles from "./icon-button.module.css";

type IconButtonSize = "compact" | "default" | "tool";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  "aria-label": string;
  children: ReactNode;
  selected?: boolean;
  size?: IconButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      "aria-label": ariaLabel,
      children,
      className,
      selected,
      size = "default",
      title,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        aria-label={ariaLabel}
        aria-pressed={typeof selected === "boolean" ? selected : undefined}
        className={classNames(styles.button, styles[size], selected && styles.selected, className)}
        ref={ref}
        title={title ?? ariaLabel}
        type={type}
      >
        {children}
      </button>
    );
  },
);
