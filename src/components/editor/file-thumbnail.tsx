"use client";

import { useEffect, useRef, useState } from "react";
import { exportToSvg } from "@excalidraw/excalidraw";
import { FileText } from "lucide-react";

interface FileThumbnailProps {
  /** Raw scene JSON string as stored on the server. */
  sceneJson: string | null;
  className?: string;
}

/**
 * Renders a small inline SVG preview of a drawing's scene.
 *
 * Lazily loads the scene content (passed as a JSON string) and uses Excalidraw's
 * `exportToSvg` to produce a thumbnail. The returned `SVGSVGElement` is mounted
 * directly via a ref (no `dangerouslySetInnerHTML`). Empty scenes (no elements)
 * fall back to a neutral document icon so the list stays scannable.
 */
export function FileThumbnail({ sceneJson, className }: FileThumbnailProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [loading, setLoading] = useState(Boolean(sceneJson));

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.replaceChildren();
    }
    if (!sceneJson) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const parsed = JSON.parse(sceneJson) as {
          elements?: unknown[];
          appState?: Record<string, unknown>;
        };
        const elements = Array.isArray(parsed.elements) ? parsed.elements : [];
        if (elements.length === 0) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }
        const svg = await exportToSvg({
          elements: elements as Parameters<typeof exportToSvg>[0]["elements"],
          appState: {
            exportBackground: false,
            viewBackgroundColor: "transparent",
            ...parsed.appState,
          },
          files: null,
          exportPadding: 4,
        });
        if (cancelled) {
          return;
        }
        if (container) {
          container.replaceChildren(svg);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sceneJson]);

  return (
    <span
      ref={containerRef}
      className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 [&_svg]:size-full [&_svg]:object-contain ${className ?? ""}`}
    >
      {loading ? (
        <span className="size-3 animate-pulse rounded-full bg-muted-foreground/40" />
      ) : (
        <FileText className="size-4 text-muted-foreground/60" />
      )}
    </span>
  );
}
