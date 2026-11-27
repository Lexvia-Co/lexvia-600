"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./clerk-auth-page.module.css";

export function ClerkAuthPage({ label, children }: { label: string; children: ReactNode }) {
  const page = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = page.current;
    if (!root) return;

    // Clerk hard-codes these accessible names outside its localization dictionary.
    const localizeLabels = () => {
      root.querySelector('input[aria-label="Enter verification code"]')?.setAttribute("aria-label", "输入验证码");
      root.querySelector('a[aria-label="Clerk logo"]')?.setAttribute("aria-label", "访问 Clerk 网站");
      root.querySelectorAll('.cl-socialButtonsProviderIcon[aria-label$=" icon"]').forEach(icon => {
        icon.setAttribute("aria-label", icon.getAttribute("aria-label")!.replace(/ icon$/, " 图标"));
      });
    };

    localizeLabels();
    const observer = new MutationObserver(localizeLabels);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
    return () => observer.disconnect();
  }, []);

  return <main ref={page} aria-label={label} className={styles.page}>{children}</main>;
}
