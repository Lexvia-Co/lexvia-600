import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export const metadata = { title: "登录" };

export default function SignInPage() {
  return <main aria-label="登录" className="auth-page"><Suspense fallback={<p role="status">正在打开登录页面…</p>}><SignIn routing="path" path="/sign-in" /></Suspense></main>;
}
