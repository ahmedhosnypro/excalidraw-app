"use client";

import dynamic from "next/dynamic";
import { PencilLine } from "lucide-react";

const Editor = dynamic(() => import("@/components/editor/editor").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <PencilLine className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Excalidraw App</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-3 animate-pulse rounded-full bg-primary/60" />
        Loading editor…
      </div>
    </div>
  ),
});

export default function Home() {
  return <Editor />;
}
