"use client";

import { useState } from "react";
import { Sidebar } from "@excalidraw/excalidraw";
import { useSession } from "next-auth/react";
import { FilePlus, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateFile, useDeleteFile, useFiles, useRenameFile } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function EditorSidebar() {
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);
  const { data: files, isLoading } = useFiles(isAuthed);
  const createFile = useCreateFile();
  const deleteFile = useDeleteFile();
  const renameFile = useRenameFile();

  const { currentFileId, setCurrentFile, setSidebarOpen, openAuth } = useEditorStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function handleCreate() {
    const file = await createFile.mutateAsync("Untitled");
    setCurrentFile(file.id, file.name);
  }

  async function handleOpen(id: string, name: string) {
    setCurrentFile(id, name);
    setSidebarOpen(false);
  }

  function startRename(id: string, name: string) {
    setRenamingId(id);
    setRenameValue(name);
  }

  async function commitRename(id: string) {
    const name = renameValue.trim() || "Untitled";
    setRenamingId(null);
    if (currentFileId === id) {
      setCurrentFile(id, name);
    }
    await renameFile.mutateAsync({ id, name });
  }

  async function handleDelete(id: string) {
    await deleteFile.mutateAsync(id);
    if (currentFileId === id) {
      setCurrentFile(null, "Untitled");
    }
    toast.success("Drawing deleted");
  }

  return (
    <Sidebar
      name="my-drawings"
      className="w-80"
      onStateChange={(state) => setSidebarOpen(state !== null)}
    >
      <Sidebar.Header>
        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-semibold">My drawings</span>
          {isAuthed && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreate}
              disabled={createFile.isPending}
            >
              {createFile.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <FilePlus className="size-3" />
              )}
              New
            </Button>
          )}
        </div>
      </Sidebar.Header>

      {!isAuthed ? (
        <div className="flex flex-col gap-3 p-4 text-sm text-muted-foreground">
          <p>
            Your drawings are saved in this browser only. Sign in to save them to the cloud and
            switch between drawings on any device.
          </p>
          <Button size="sm" onClick={() => openAuth("signup")}>
            Create a free account
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-2 p-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !files || files.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">
          No drawings yet. Click <span className="font-medium text-foreground">New</span> to create
          one.
        </div>
      ) : (
        <div className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto p-2">
          {files.map((file) => {
            const isActive = file.id === currentFileId;
            const isRenaming = renamingId === file.id;
            return (
              <div
                key={file.id}
                className={`group flex items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors ${
                  isActive ? "border-primary/40 bg-accent" : "border-transparent hover:bg-accent/60"
                }`}
              >
                {isRenaming ? (
                  <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitRename(file.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="h-7"
                  />
                ) : (
                  <button
                    type="button"
                    className="flex flex-1 flex-col items-start gap-0.5 overflow-hidden text-left"
                    onClick={() => handleOpen(file.id, file.name)}
                  >
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(file.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                )}
                {!isRenaming && (
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
                      <DropdownMenuItem onSelect={() => startRename(file.id, file.name)}>
                        <Pencil className="mr-2 size-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleDelete(file.id)}
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
          })}
        </div>
      )}
    </Sidebar>
  );
}
