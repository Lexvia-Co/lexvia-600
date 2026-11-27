import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VisaStreamLabel } from "@/components/visa-stream-label";
import { OFFICIAL } from "@/lib/workspace/model";
import sydneyPostcard from "@/public/images/sydney-postcard.webp";
import styles from "./home.module.css";

// Applicant guidance checked against OFFICIAL.stream and OFFICIAL.visitor on 2026-11-27.
const preparationSteps = [
  { title: "填写行程", description: "写下什么时候去、住在哪里、旅行费用由谁承担。" },
  { title: "整理材料", description: "按清单整理材料，把原件和英文译本放在一起。" },
  { title: "核对并递交", description: "核对草稿后，到自己的 ImmiAccount 填写申请、上传文件并缴费递交。" },
];

export default function Home() {
  return (
    <main className="grow">
      <section className={`public-shell ${styles.hero}`} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <VisaStreamLabel />
          <h1 id="home-title" className={styles.headline}>准备你的<span>澳大利亚访客签证</span></h1>
          <p className={styles.summary}>
            想去澳大利亚旅游或探亲访友？在这里用中文填写行程、准备材料，再到 <a href={OFFICIAL.immi} lang="en" className="text-link">ImmiAccount</a> 递交申请。
          </p>
          <div className={styles.actions}>
            <Button asChild size="lg">
              <Link href="/guide">查看准备指南 <span aria-hidden="true">→</span></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/applications" prefetch={false}>继续我的草稿</Link>
            </Button>
          </div>
        </div>
        <Image
          src={sydneyPostcard}
          alt=""
          sizes="(max-width: 800px) 91vw, (max-width: 1354px) 45vw, 600px"
          loading="eager"
          fetchPriority="high"
          className={styles.postcard}
        />
      </section>

      <section className={`public-shell ${styles.process}`} aria-labelledby="process-title">
        <h2 id="process-title" className={styles.sectionTitle}>从准备到递交</h2>
        <ol className={styles.steps} role="list">
          {preparationSteps.map(({ title, description }, index) => (
            <li key={title}>
              <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.example} aria-labelledby="example-title">
        <div className={`public-shell ${styles.exampleLayout}`}>
          <div className={styles.exampleCopy}>
            <h2 id="example-title" className={styles.sectionTitle}>材料整理示例</h2>
            <p>如果亲友用中文写了邀请信，可以把原件和英文译本存在一起。</p>
            <a className="text-link" href={OFFICIAL.visitor}>
              查看 Home Affairs 的材料说明 <span aria-hidden="true">↗</span>
            </a>
          </div>
          <ul className={styles.files} role="list" aria-label="邀请信原件和英文译本">
            <li>
              <div className={styles.fileRow}>
                <span className={styles.fileIcon} aria-hidden="true" />
                <span>亲友邀请信.pdf</span><small>原件</small>
              </div>
              <ul className={styles.translation} role="list">
                <li className={styles.fileRow}>
                  <span className={styles.fileIcon} aria-hidden="true" />
                  <bdi lang="en">Invitation-letter-EN.pdf</bdi><small>英文译本</small>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
