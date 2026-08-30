"use client";

import { useState } from "react";
import { Loader2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useBatchAction, useFolders } from "@/hooks/use-files";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BatchActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
}

/** Sticky bar shown when files are selected: bulk star/move/delete + select-all toggle. */
export function BatchActionsBar({ selectedIds, onClear }: BatchActionsBarProps) {
  const batchAction = useBatchAction();
  const { data: folders } = useFolders(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const count = selectedIds.length;

  async function handleAction(action: "star" | "unstar") {
    try {
      const result = await batchAction.mutateAsync({ action, fileIds: selectedIds });
      toast.success(
        `${result.count} drawing${result.count === 1 ? "" : "s"} ${action === "star" ? "starred" : "unstarred"}`
      );
      onClear();
    } catch {
      toast.error("Batch action failed.");
    }
  }

  async function handleMove(folderId: string | null) {
    try {
      const result = await batchAction.mutateAsync({
        action: "move",
        fileIds: selectedIds,
        folderId,
      });
      toast.success(`${result.count} drawing${result.count === 1 ? "" : "s"} moved`);
      onClear();
    } catch {
      toast.error("Could not move drawings.");
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    try {
      const result = await batchAction.mutateAsync({ action: "delete", fileIds: selectedIds });
      toast.success(`${result.count} drawing${result.count === 1 ? "" : "s"} deleted`);
      onClear();
    } catch {
      toast.error("Could not delete drawings.");
    }
  }

  if (count === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b bg-primary/5 px-3 py-2 text-sm">
        <span className="font-medium">{count} selected</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2"
            onClick={() => handleAction("star")}
            disabled={batchAction.isPending}
          >
            <Star className="size-3.5" />
            Star
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                disabled={batchAction.isPending}
              >
                Move
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleMove(null)}>
                No folder (root)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {folders?.map((f) => (
                <DropdownMenuItem key={f.id} onSelect={() => handleMove(f.id)}>
                  {f.name}
                </DropdownMenuItem>
              ))}
              {(!folders || folders.length === 0) && (
                <DropdownMenuItem disabled>No folders</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={batchAction.isPending}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-1"
            onClick={onClear}
            aria-label="Clear selection"
          >
            <X className="size-3.5" />
          </Button>
        </div>
        {batchAction.isPending && <Loader2 className="size-3 animate-spin" />}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} drawings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {count} drawing{count === 1 ? "" : "s"} and their
              content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchAction.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={batchAction.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchAction.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete {count}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
