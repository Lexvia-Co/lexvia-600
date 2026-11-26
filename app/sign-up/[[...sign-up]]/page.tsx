import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export const metadata = { title: "注册" };

export default function SignUpPage() {
  return <main aria-label="注册" className="auth-page"><Suspense fallback={<p role="status">正在打开注册页面…</p>}><SignUp routing="path" path="/sign-up" /></Suspense></main>;
}
