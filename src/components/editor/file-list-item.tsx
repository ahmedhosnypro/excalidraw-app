"use client";

import { useState } from "react";
import { Copy, FolderInput, MoreVertical, Pencil, Share2, Trash2 } from "lucide-react";

import { useDuplicateFile, useFileContent, useRenameFile } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FileThumbnail } from "@/components/editor/file-thumbnail";

interface FileListItemProps {
  fileId: string;
  name: string;
  shareToken: string | null;
  folderId: string | null;
  updatedAt: string;
}

/** A single drawing row in the sidebar: thumbnail + name + relative time + menu. */
export function FileListItem({ fileId, name, shareToken, folderId, updatedAt }: FileListItemProps) {
  const renameFile = useRenameFile();
  const duplicateFile = useDuplicateFile();
  const { data: sceneJson } = useFileContent(fileId);

  const {
    currentFileId,
    setCurrentFile,
    setSidebarOpen,
    setPendingDelete,
    openShareDialog,
    openMoveDialog,
  } = useEditorStore();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);

  const isActive = fileId === currentFileId;

  async function handleOpen() {
    setCurrentFile(fileId, name, shareToken, folderId);
    setSidebarOpen(false);
  }

  function startRename() {
    setRenameValue(name);
    setRenaming(true);
  }

  async function commitRename() {
    setRenaming(false);
    const next = renameValue.trim() || "Untitled";
    if (currentFileId === fileId) {
      setCurrentFile(fileId, next);
    }
    if (next !== name) {
      await renameFile.mutateAsync({ id: fileId, name: next });
    }
  }

  async function handleDuplicate() {
    try {
      const copy = await duplicateFile.mutateAsync(fileId);
      setCurrentFile(copy.id, copy.name, copy.shareToken);
    } catch {
      // toast handled by caller context
    }
  }

  function handleShare() {
    setCurrentFile(fileId, name, shareToken);
    openShareDialog();
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors",
        isActive ? "border-primary/40 bg-accent" : "border-transparent hover:bg-accent/60"
      )}
    >
      {!renaming && <FileThumbnail sceneJson={sceneJson ?? null} />}
      {renaming ? (
        <Input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commitRename();
            if (e.key === "Escape") setRenaming(false);
          }}
          className="h-7"
        />
      ) : (
        <button
          type="button"
          className="flex flex-1 flex-col items-start gap-0.5 overflow-hidden text-left"
          onClick={handleOpen}
        >
          <span className="flex w-full items-center gap-1">
            <span className="truncate font-medium">{name}</span>
            {shareToken && (
              <Share2
                className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-label="Shared"
              />
            )}
          </span>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(updatedAt)}</span>
        </button>
      )}
      {!renaming && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={startRename}>
              <Pencil className="mr-2 size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDuplicate}>
              <Copy className="mr-2 size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleShare()}>
              <Share2 className="mr-2 size-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openMoveDialog(fileId, name, folderId)}>
              <FolderInput className="mr-2 size-4" />
              Move to folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setPendingDelete({ id: fileId, name })}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
