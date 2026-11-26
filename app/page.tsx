import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OFFICIAL } from "@/lib/workspace/model";

export default function Home() {
  return (
    <main className="public-shell grow">
      <div className="home-intro">
        <div>
          <p className="stream-label" lang="en">Visitor visa (subclass 600) · Tourist stream</p>
          <h1 className="home-heading">准备你的<br />澳大利亚访客签证</h1>
          <p className="intro-copy">计划从中国大陆赴澳旅游或探亲访友？先了解适用范围，再按自己的行程和费用安排，逐项备齐材料。</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/guide">查看指南并开始 <span aria-hidden="true">→</span></Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/applications" prefetch={false}>继续准备草稿</Link></Button>
          </div>
        </div>
        <aside className="guide-note">
          <h2>申请前，先理清三件事</h2>
          <dl className="prep-list">
            <div><dt>赴澳目的</dt><dd>写清要去哪里、停留多久，以及是否探访亲友。</dd></div>
            <div><dt>旅行费用</dt><dd>说明由谁付款，以及相应的资金来源。</dd></div>
            <div><dt>回国安排</dt><dd>整理工作、学习或家庭方面的实际安排。</dd></div>
          </dl>
          <a className="text-link" href={OFFICIAL.visitor}>查看 Home Affairs 的材料说明 ↗</a>
        </aside>
      </div>
      <section className="home-foot">
        <h2>从准备到递交</h2>
        <div className="foot-grid">
          <div><h3>随时保存</h3><p>在手机上开始，在电脑上用同一个账号继续。</p></div>
          <div><h3>按情况整理</h3><p>根据谁邀请、谁付费，准备对应的证明和英文译件。</p></div>
          <div><h3>自行递交</h3><p>在 VBER 免费整理资料，再到 <a className="text-link" href={OFFICIAL.immi}>ImmiAccount</a> 核对、缴费并提交申请。</p></div>
        </div>
      </section>
    </main>
  );
}
