"use client";

import { History, Loader2, RotateCcw, Camera } from "lucide-react";
import { toast } from "sonner";

import { useCreateSnapshot, useRestoreVersion, useVersions } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function VersionHistoryDialog() {
  const { historyDialog, closeHistoryDialog, excalidrawApi } = useEditorStore();
  const open = historyDialog !== null;
  const fileId = historyDialog?.fileId ?? null;
  const fileName = historyDialog?.name ?? "";

  const { data: versions, isLoading } = useVersions(fileId);
  const createSnapshot = useCreateSnapshot();
  const restoreVersion = useRestoreVersion();

  async function handleCreateSnapshot() {
    if (!fileId) {
      return;
    }
    // Force-save the current scene first so the snapshot captures the latest state.
    if (excalidrawApi) {
      const elements = excalidrawApi.getSceneElements();
      const appState = excalidrawApi.getAppState();
      const files = excalidrawApi.getFiles();
      const scene = JSON.stringify({ elements, appState, files });
      await fetch(`/api/files/${fileId}/content`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(scene),
      });
    }
    try {
      await createSnapshot.mutateAsync(fileId);
      toast.success("Snapshot created.");
    } catch {
      toast.error("Could not create a snapshot.");
    }
  }

  async function handleRestore(versionId: string) {
    if (!fileId) {
      return;
    }
    try {
      await restoreVersion.mutateAsync({ fileId, versionId });
      toast.success("Restored — reloading the editor.");
      // Reload to apply the restored content (the editor remounts on file id key).
      window.location.reload();
    } catch {
      toast.error("Could not restore this version.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : closeHistoryDialog())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            Version history
          </DialogTitle>
          <DialogDescription>
            {fileName ? (
              <>
                Restore previous versions of{" "}
                <span className="font-medium text-foreground">{fileName}</span>. Snapshots are
                created automatically on save; the last 20 are kept.
              </>
            ) : (
              "Restore previous versions of this drawing."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {versions ? `${versions.length} version${versions.length === 1 ? "" : "s"}` : "—"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateSnapshot}
            disabled={createSnapshot.isPending}
            className="h-7 gap-1 px-2"
          >
            {createSnapshot.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Camera className="size-3" />
            )}
            Snapshot now
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <History className="size-7 text-muted-foreground/50" />
              <p>No versions yet. Edit the drawing and save to create snapshots automatically.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{formatRelativeTime(v.createdAt)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(v.sizeBytes)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(v.id)}
                    disabled={restoreVersion.isPending}
                    className="h-7 gap-1 px-2"
                  >
                    <RotateCcw className="size-3" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
