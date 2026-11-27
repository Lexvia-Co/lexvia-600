import { VisaStreamLabel } from "@/components/visa-stream-label";
import { OFFICIAL } from "@/lib/workspace/model";
import { ScopeCheck } from "./scope-check";
import styles from "./guide.module.css";

export const metadata = { title: "赴澳旅游或探亲访友申请指南" };

export default function GuidePage() {
  return (
    <main className={`public-shell ${styles.guide}`}>
      <header className={styles.introduction}>
        <VisaStreamLabel />
        <h1 className="page-heading">赴澳旅游或探亲访友申请指南</h1>
        <p className="intro-copy">如果你已满 18 岁，正在澳大利亚境外为自己准备申请，可以从这里开始。递交申请时，以及澳大利亚内政部（Home Affairs）作出决定时，你都必须在澳大利亚境外。</p>
      </header>
      <div className={styles.columns}>
        <ScopeCheck />
        <aside className={styles.notes}>
          <h2>准备与递交</h2>
          <p>你可以在 VBER 整理材料，把原件和英文译本存在一起。递交时请打开自己的 ImmiAccount，按里面的清单上传文件。</p>
          <p>草稿和文件保留 90 天。从「我的草稿」继续填写，或在草稿里保存修改后，都会再保留 90 天。你随时可以删除草稿。</p>
          <h3>官方信息</h3>
          <ul className={styles.resources} role="list">
            <li><a href={OFFICIAL.stream}>申请条件、费用和审理时间 <span aria-hidden="true">↗</span></a></li>
            <li><a href={OFFICIAL.visitor}>访客签证材料示例 <span aria-hidden="true">↗</span></a></li>
            <li><a href={OFFICIAL.attachments}>如何上传申请材料 <span aria-hidden="true">↗</span></a></li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
