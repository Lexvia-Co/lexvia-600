"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <section className="workspace-standing">
    <h1>暂时无法打开草稿</h1>
    <p>请检查网络连接，然后重试。</p>
    <Button type="button" onClick={reset}>重新载入</Button>
  </section>;
}
