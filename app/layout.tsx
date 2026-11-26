import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appName = "VBER";

export const metadata: Metadata = {
  applicationName: appName,
  title: `澳大利亚访客签证申请准备 | ${appName}`,
  description: "Prepare for the Australian Visitor visa (subclass 600) Tourist stream.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <ClerkProvider>
          <header className="border-b border-border">
            <div className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
              <span className="text-lg font-semibold">{appName}</span>
              <div className="flex items-center gap-2">
                <Suspense>
                  <Show when="signed-out">
                    <SignInButton>
                      <Button variant="ghost">Sign in</Button>
                    </SignInButton>
                    <SignUpButton>
                      <Button>Sign up</Button>
                    </SignUpButton>
                  </Show>
                  <Show when="signed-in">
                    <UserButton />
                  </Show>
                </Suspense>
              </div>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
