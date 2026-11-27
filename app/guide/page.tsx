import { OFFICIAL, GUIDE_VERSION } from "@/lib/workspace/model";
import { ScopeCheck } from "./scope-check";
export const metadata = { title: "赴澳旅游与探亲申请指南" };

export default function GuidePage() {
  return <main className="public-shell guide-main">
    <p className="stream-label" lang="en">Visitor visa (subclass 600) · Tourist stream</p>
    <h1 className="page-heading">赴澳旅游与探亲申请指南</h1>
    <p className="intro-copy">这份指南供年满 18 岁、在澳大利亚境外自行申请的人使用。该签证分支要求申请人在递交申请和收到决定时均在澳大利亚境外。</p>
    <div className="guide-columns">
      <ScopeCheck />
      <aside className="official-notes">
        <h2>准备与递交</h2>
        <p>在 VBER 整理资料、保存原件和英文译件。最终所需文件以你本人在 ImmiAccount 中看到的清单为准。</p>
        <p>你可以随时删除草稿。主动继续准备或成功修改草稿后，可再保存 90 天。</p>
        <h3>官方信息</h3>
        <a className="text-link" href={OFFICIAL.stream}>申请条件、费用和审理时间 ↗</a>
        <a className="text-link" href={OFFICIAL.visitor}>访客签证材料示例 ↗</a>
        <a className="text-link" href={OFFICIAL.attachments}>ImmiAccount 文件上传说明 ↗</a>
        <small>指南核对日期：{GUIDE_VERSION}</small>
      </aside>
    </div>
  </main>;
}
