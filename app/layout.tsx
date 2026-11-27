import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import { zhCN } from "@clerk/localizations/zh-CN";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "VBER",
  title: { default: "澳大利亚访客签证申请准备 | VBER", template: "%s | VBER" },
  description: "为赴澳旅游或探亲访友整理个人资料、证明材料和文书，核对后前往 ImmiAccount 自行递交。",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="zh-CN" className="min-h-full antialiased">
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <ClerkProvider localization={zhCN} signInUrl="/sign-in" signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/applications" signUpFallbackRedirectUrl="/applications">
          <a className="skip-link" href="#page-content">跳至主要内容</a>
          <header className="site-header">
            <div className="public-shell flex min-h-16 items-center justify-between gap-3">
              <Link href="/" aria-label="VBER 首页" className="wordmark">VBER<span aria-hidden="true">.</span></Link>
              <nav className="flex items-center gap-2 sm:gap-5" aria-label="主导航">
                <Link className="nav-link" href="/guide">申请指南</Link>
                <Link className="nav-link" href="/applications" prefetch={false}>我的草稿</Link>
                <Suspense>
                  <Show when="signed-out"><Button asChild size="sm" variant="outline"><Link href="/sign-in">登录</Link></Button></Show>
                  <Show when="signed-in"><UserButton /></Show>
                </Suspense>
              </nav>
            </div>
          </header>
          <div id="page-content" tabIndex={-1} className="flex flex-1 flex-col">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}
