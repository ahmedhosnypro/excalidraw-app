"use client";

import { useEffect, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";
import { Eye, Loader2, PencilLine } from "lucide-react";

import { fetchSharedFile } from "@/hooks/use-files";
import { parseScene } from "@/lib/scene";

type ExcalidrawProps = React.ComponentProps<typeof Excalidraw>;
type InitialDataState = NonNullable<
  Awaited<Extract<NonNullable<ExcalidrawProps["initialData"]>, Promise<unknown>>>
>;

type SharedState =
  | { status: "loading" }
  | { status: "ready"; name: string; data: InitialDataState }
  | { status: "not-found" };

/**
 * Read-only public viewer for a shared drawing.
 *
 * Rendered when the URL carries a `?share=<token>` query param. Loads the
 * shared scene via the public API (no auth), then mounts Excalidraw with
 * `viewModeEnabled` so the drawing cannot be edited — only viewed + exported.
 */
export function SharedEditor({ token }: { token: string }) {
  const { theme } = useTheme();
  const [state, setState] = useState<SharedState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const shared = await fetchSharedFile(token);
      if (cancelled) {
        return;
      }
      if (!shared) {
        setState({ status: "not-found" });
        return;
      }
      setState({
        status: "ready",
        name: shared.name,
        data: (parseScene(shared.data) as InitialDataState) ?? { elements: [], appState: {} },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading shared drawing…</p>
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <PencilLine className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">Drawing not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This share link is invalid or has been revoked by its owner.
        </p>
        <a
          href="/"
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Excalidraw App
        </a>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
        <Eye className="size-3" />
        <span className="font-medium text-foreground">{state.name}</span>
        <span>· read-only</span>
      </div>
      <Excalidraw
        initialData={state.data}
        viewModeEnabled
        theme={theme === "dark" ? "dark" : "light"}
        name={state.name}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: { saveFileToDisk: true },
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: true,
          },
        }}
      />
    </div>
  );
}
