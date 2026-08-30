"use client";

import { Clock } from "lucide-react";

import type { FileSummary } from "@/lib/types";
import { useFileContent, useRecentFiles } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import { formatRelativeTime } from "@/lib/utils";
import { FileThumbnail } from "@/components/editor/file-thumbnail";

/**
 * Compact "Recent" section shown above the file list when drawings exist.
 * Shows up to 5 most-recently-opened drawings as quick-access thumbnails.
 */
export function RecentFiles() {
  const { data: recent } = useRecentFiles(true);
  const { setCurrentFile, setSidebarOpen, currentFileId } = useEditorStore();

  if (!recent || recent.length === 0) {
    return null;
  }

  function open(file: FileSummary) {
    setCurrentFile(file.id, file.name, file.shareToken, file.folderId);
    setSidebarOpen(false);
  }

  return (
    <div className="border-b p-2">
      <span className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Recent
      </span>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
        {recent.map((file) => {
          const isActive = file.id === currentFileId;
          return (
            <button
              key={file.id}
              type="button"
              onClick={() => open(file)}
              className={`flex w-20 shrink-0 flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors ${
                isActive ? "border-primary/40 bg-accent" : "border-transparent hover:bg-accent/60"
              }`}
              title={file.name}
            >
              <div className="flex size-12 items-center justify-center">
                <RecentThumb fileId={file.id} />
              </div>
              <span className="line-clamp-1 w-full text-xs font-medium">{file.name}</span>
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="size-2.5" />
                {formatRelativeTime(file.updatedAt)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Renders a thumbnail for a recent file by lazy-loading its content. */
function RecentThumb({ fileId }: { fileId: string }) {
  const { data } = useFileContent(fileId);
  return <FileThumbnail sceneJson={data ?? null} />;
}
