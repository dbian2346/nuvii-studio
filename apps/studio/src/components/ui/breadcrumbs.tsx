import Image from "next/image";
import styles from "./breadcrumbs.module.css";

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <Image alt="" aria-hidden="true" height={20} src="/icons/nuvii/folder.svg" width={20} />
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {index > 0 ? (
                <Image alt="" aria-hidden="true" height={11} src="/icons/nuvii/chevron-right.svg" width={11} />
              ) : null}
              {current || !item.href ? (
                <span aria-current={current ? "page" : undefined}>{item.label}</span>
              ) : (
                <a href={item.href}>{item.label}</a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
