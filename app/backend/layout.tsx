import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Backend walkthrough — Text analyzer",
  description:
    "Annotated POST /api/analyze implementation for reviewers: code blocks with comments, anchors, and copy.",
};

export default function BackendLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
