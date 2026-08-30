"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { exportToBlob, exportToSvg } from "@excalidraw/excalidraw";

export type ExportFormat = "png" | "svg";

/**
 * Export the current scene to a downloadable file.
 *
 * Uses the Excalidraw imperative API to read the live scene (elements + appState
 * + files), renders it via `exportToBlob` (PNG) or `exportToSvg` (SVG), then
 * triggers a browser download. Runs entirely client-side — no server round-trip.
 */
export async function exportScene(
  api: ExcalidrawImperativeAPI,
  format: ExportFormat,
  fileName: string
): Promise<void> {
  const elements = api.getSceneElements();
  const appState = api.getAppState();
  const files = api.getFiles();

  if (format === "svg") {
    const svg = await exportToSvg({
      elements,
      appState: { ...appState, exportBackground: true },
      files,
      exportPadding: 10,
    });
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
    triggerDownload(blob, `${fileName}.svg`);
    return;
  }

  const blob = await exportToBlob({
    elements,
    appState: { ...appState, exportBackground: true },
    files,
    mimeType: "image/png",
    quality: 0.92,
    exportPadding: 10,
  });
  triggerDownload(blob, `${fileName}.png`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
