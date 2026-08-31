import Image from "next/image";
import { classNames } from "./class-names";
import styles from "./icon.module.css";

const iconPixels = {
  small: 20,
  medium: 24,
  large: 35,
} as const;

export type IconSize = keyof typeof iconPixels;

export interface IconProps {
  className?: string;
  size?: IconSize;
  src: string;
}

export function Icon({ className, size = "medium", src }: IconProps) {
  const pixels = iconPixels[size];

  return (
    <span aria-hidden="true" className={classNames(styles.icon, styles[size], className)}>
      <Image alt="" height={pixels} src={src} width={pixels} />
    </span>
  );
}
