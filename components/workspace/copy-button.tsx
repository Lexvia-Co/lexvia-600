import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, targetId, label, children }: {
  text: string; targetId: string; label: string; children: React.ReactNode;
}) {
  const [feedback, setFeedback] = useState("");
  async function copy() {
    let message: string;
    try {
      await navigator.clipboard.writeText(text);
      message = label + "已复制。";
    } catch {
      const target = document.getElementById(targetId);
      if (target instanceof HTMLTextAreaElement) {
        target.focus();
        target.select();
      } else if (target) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      message = "请手动复制选中的文字。";
    }
    setFeedback(previous => previous === message ? message + "\u00a0" : message);
  }
  return <span className="copy-control no-print">
    <Button type="button" variant="outline" size="sm" disabled={!text.trim()} onClick={copy}
      aria-label={`复制${label}`}>{children}</Button>
    <span className="workspace-meta copy-feedback" role="status">{feedback}</span>
  </span>;
}
