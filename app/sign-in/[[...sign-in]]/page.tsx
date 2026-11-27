import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { ClerkAuthPage } from "@/components/clerk-auth-page";

export const metadata = { title: "登录" };

export default function SignInPage() {
  return <ClerkAuthPage label="登录"><Suspense fallback={<p role="status">正在打开登录页面…</p>}><SignIn routing="path" path="/sign-in" /></Suspense></ClerkAuthPage>;
}
