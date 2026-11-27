import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OFFICIAL } from "@/lib/workspace/model";
import harbourPhoto from "@/public/images/sydney-harbour.webp";

// Applicant guidance checked against OFFICIAL.stream and OFFICIAL.visitor on 2026-11-27.
const preparationSteps = [
  { title: "填写行程", description: "写下什么时候去、住在哪里、旅行费用由谁承担。" },
  { title: "整理材料", description: "按清单整理材料，把原件和英文译本放在一起。" },
  { title: "核对并递交", description: "核对草稿后，到自己的 ImmiAccount 填写申请、上传文件并缴费递交。" },
];

export default function Home() {
  return (
    <main className="home-page grow">
      <section className="home-hero" aria-labelledby="home-title">
        <Image
          src={harbourPhoto}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="home-photo"
        />
        <div className="public-shell home-hero-copy">
          <p className="home-visa-name" lang="en">
            Visitor visa (subclass 600) · <span>Tourist stream</span>
          </p>
          <h1 id="home-title">准备你的<wbr /><span>澳大利亚访客签证</span></h1>
          <p className="home-summary">
            想去澳大利亚旅游或探亲访友？在这里用中文填写行程、准备材料，再到 <a href={OFFICIAL.immi} lang="en" className="underline underline-offset-4">ImmiAccount</a> 递交申请。
          </p>
          <div className="home-actions">
            <Button asChild size="lg">
              <Link href="/guide">查看准备指南 <span aria-hidden="true">→</span></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/applications" prefetch={false}>继续我的草稿</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="home-process" aria-labelledby="process-title">
        <h2 id="process-title" className="sr-only">从准备到递交</h2>
        <ol className="public-shell home-steps" role="list">
          {preparationSteps.map(({ title, description }, index) => (
            <li key={title}>
              <span className="home-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-example" aria-labelledby="example-title">
        <div className="public-shell home-example-layout">
          <div>
            <h2 id="example-title">材料整理示例</h2>
            <p>如果亲友用中文写了邀请信，可以把原件和英文译本存在一起。</p>
          </div>
          <ul className="home-files" role="list" aria-label="邀请信原件和英文译本">
            <li>
              <div className="home-file-row"><span>原件</span>亲友邀请信.pdf</div>
              <ul className="home-translations" role="list">
                <li className="home-file-row"><span>英文译本</span><bdi lang="en">Invitation-letter-EN.pdf</bdi></li>
              </ul>
            </li>
          </ul>
          <a className="text-link home-official-link" href={OFFICIAL.visitor}>
            查看 Home Affairs 的材料说明 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </main>
  );
}
