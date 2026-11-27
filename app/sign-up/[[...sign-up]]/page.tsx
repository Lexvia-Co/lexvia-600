import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { ClerkAuthPage } from "@/components/clerk-auth-page";

export const metadata = { title: "注册" };

export default function SignUpPage() {
  return <ClerkAuthPage label="注册"><Suspense fallback={<p role="status">正在打开注册页面…</p>}><SignUp routing="path" path="/sign-up" /></Suspense></ClerkAuthPage>;
}
