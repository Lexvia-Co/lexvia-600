import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <section className="workspace-standing">
    <h1>无法打开这份草稿</h1>
    <p>回到「我的草稿」，就能看到这个账号下还在保存期内的草稿。</p>
    <Button asChild><Link href="/applications">返回我的草稿</Link></Button>
  </section>;
}
