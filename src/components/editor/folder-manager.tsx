"use client";

import { useState } from "react";
import { FolderPlus, Folder, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateFolder, useDeleteFolder, useRenameFolder } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

interface FolderRow {
  id: string;
  name: string;
  count: number;
}

/** Folder list shown at the top of the sidebar: create, rename, delete, filter. */
export function FolderManager({
  folders,
  counts,
}: {
  folders: { id: string; name: string }[];
  counts: Map<string, number>;
}) {
  const { folderFilter, setFolderFilter } = useEditorStore();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    try {
      await createFolder.mutateAsync(name);
      setNewName("");
      setCreating(false);
    } catch {
      toast.error("Could not create the folder.");
    }
  }

  function startRename(id: string, name: string) {
    setRenamingId(id);
    setRenameValue(name);
  }

  async function commitRename(id: string) {
    setRenamingId(null);
    const name = renameValue.trim() || "Untitled";
    await renameFolder.mutateAsync({ id, name });
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const { id, name } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteFolder.mutateAsync(id);
      if (folderFilter === id) {
        setFolderFilter(null);
      }
      toast.success(`Deleted folder "${name}" — drawings moved to root.`);
    } catch {
      toast.error("Could not delete the folder.");
    }
  }

  const rows: FolderRow[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    count: counts.get(f.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-0.5 border-b p-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label="Create folder"
          onClick={() => setCreating((v) => !v)}
        >
          {createFolder.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <FolderPlus className="size-3" />
          )}
        </Button>
      </div>

      {creating && (
        <Input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Folder name…"
          className="h-7 text-xs"
          onBlur={handleCreate}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
            if (e.key === "Escape") {
              setCreating(false);
              setNewName("");
            }
          }}
        />
      )}

      <button
        type="button"
        onClick={() => setFolderFilter(null)}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
          folderFilter === null ? "bg-accent font-medium" : "hover:bg-accent/60"
        }`}
      >
        <Folder className="size-3.5 text-muted-foreground" />
        All drawings
      </button>

      {rows.map((folder) => {
        const isActive = folderFilter === folder.id;
        const isRenaming = renamingId === folder.id;
        return (
          <div
            key={folder.id}
            className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              isActive ? "bg-accent font-medium" : "hover:bg-accent/60"
            }`}
          >
            {isRenaming ? (
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitRename(folder.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="h-6 text-xs"
              />
            ) : (
              <button
                type="button"
                className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                onClick={() => setFolderFilter(isActive ? null : folder.id)}
              >
                <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{folder.name}</span>
                {folder.count > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal">
                    {folder.count}
                  </Badge>
                )}
              </button>
            )}
            {!isRenaming && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => startRename(folder.id, folder.name)}>
                    <Pencil className="mr-2 size-3" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setPendingDelete({ id: folder.id, name: folder.name })}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-3" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete{" "}
              <span className="font-medium text-foreground">"{pendingDelete?.name}"</span>. Drawings
              inside are moved to root (not deleted).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFolder.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteFolder.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFolder.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
