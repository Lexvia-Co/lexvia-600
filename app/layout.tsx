import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import { zhCN } from "@clerk/localizations/zh-CN";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ActiveSiteNavLinks, SiteNavLinks } from "@/components/site-nav-links";
import "./globals.css";

const localization = {
  ...zhCN,
  formFieldInputPlaceholder__emailAddress_username: "输入邮箱或用户名",
  formFieldInputPlaceholder__username: "输入用户名",
  formFieldInputPlaceholder__phoneNumber: "输入手机号",
  formFieldInputPlaceholder__password: "输入密码",
  formFieldInputPlaceholder__signUpPassword: "设置密码",
};

export const metadata: Metadata = {
  applicationName: "VBER",
  title: { default: "准备澳大利亚访客签证申请 | VBER", template: "%s | VBER" },
  description: "在 VBER 用中文填写赴澳行程、整理证明材料、准备英文文书，再到自己的 ImmiAccount 递交申请。",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="zh-CN" className="min-h-full antialiased">
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <ClerkProvider localization={localization} signInUrl="/sign-in" signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/applications" signUpFallbackRedirectUrl="/applications">
          <a className="skip-link" href="#page-content">跳至主要内容</a>
          <header className="site-header">
            <div className="public-shell header-inner">
              <Link href="/" aria-label="VBER 首页" className="wordmark">VBER</Link>
              <nav className="site-nav" aria-label="主导航">
                <Suspense fallback={<SiteNavLinks />}>
                  <ActiveSiteNavLinks />
                </Suspense>
                <Suspense>
                  <Show when="signed-out"><Button asChild size="sm" variant="secondary"><Link href="/sign-in">登录</Link></Button></Show>
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
