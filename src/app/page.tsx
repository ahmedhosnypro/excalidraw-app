"use client";

import dynamic from "next/dynamic";
import { PencilLine } from "lucide-react";

const Editor = dynamic(() => import("@/components/editor/editor").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-background">
      <PencilLine className="size-8 animate-pulse text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading editor…</p>
    </div>
  ),
});

export default function Home() {
  return <Editor />;
}
