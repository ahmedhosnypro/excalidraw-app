"use client";

import { useState } from "react";
import { FolderInput, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useFolders, useMoveFile } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function MoveToFolderDialog() {
  const { moveDialog, closeMoveDialog } = useEditorStore();
  const open = moveDialog !== null;
  const fileId = moveDialog?.fileId ?? "";
  const fileName = moveDialog?.name ?? "";
  const currentFolderId = moveDialog?.folderId ?? null;

  const { data: folders, isLoading } = useFolders(open);
  const moveFile = useMoveFile();
  const [selected, setSelected] = useState<string | null>(currentFolderId);

  async function handleMove() {
    if (!fileId) {
      return;
    }
    try {
      await moveFile.mutateAsync({ fileId, folderId: selected });
      toast.success(`Moved "${fileName}"`);
      closeMoveDialog();
    } catch {
      toast.error("Could not move the drawing.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          closeMoveDialog();
        } else {
          setSelected(currentFolderId);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="size-4" />
            Move to folder
          </DialogTitle>
          <DialogDescription>
            Choose a folder for <span className="font-medium text-foreground">{fileName}</span>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selected === null
                  ? "border-primary/40 bg-accent"
                  : "border-transparent hover:bg-accent/60"
              }`}
            >
              No folder (root)
            </button>
            {!folders || folders.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No folders yet. Create one from the sidebar.
              </p>
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelected(folder.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selected === folder.id
                      ? "border-primary/40 bg-accent"
                      : "border-transparent hover:bg-accent/60"
                  }`}
                >
                  {folder.name}
                </button>
              ))
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={closeMoveDialog}
            disabled={moveFile.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleMove} disabled={moveFile.isPending}>
            {moveFile.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Move
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
