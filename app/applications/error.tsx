"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <section className="workspace-standing">
    <h1>暂时无法打开草稿</h1>
    <p>请稍后再试。如果一直打不开，可以检查一下网络连接。</p>
    <Button type="button" onClick={reset}>重试</Button>
  </section>;
}
