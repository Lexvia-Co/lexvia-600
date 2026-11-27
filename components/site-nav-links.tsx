"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

export function SiteNavLinks({ segment }: { segment?: string | null }) {
  return (
    <>
      <Link className="nav-link" href="/guide" aria-current={segment === "guide" ? "page" : undefined}>申请指南</Link>
      <Link className="nav-link" href="/applications" prefetch={false} aria-current={segment === "applications" ? "location" : undefined}>我的草稿</Link>
    </>
  );
}

export function ActiveSiteNavLinks() {
  return <SiteNavLinks segment={useSelectedLayoutSegment()} />;
}
