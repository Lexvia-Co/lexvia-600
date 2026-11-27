import type { Viewport } from "next";
import "./workspace.css";

export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <main className="workspace">{children}</main>;
}
