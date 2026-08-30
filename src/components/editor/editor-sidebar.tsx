"use client";

import { useMemo, useState } from "react";
import { Sidebar } from "@excalidraw/excalidraw";
import { useSession } from "next-auth/react";
import { Copy, FilePlus, Loader2, MoreVertical, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateFile,
  useDeleteFile,
  useDuplicateFile,
  useFiles,
  useRenameFile,
} from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/editor/user-avatar";

const MIN_FILES_FOR_SEARCH = 4;

export function EditorSidebar() {
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);
  const { data: files, isLoading } = useFiles(isAuthed);
  const createFile = useCreateFile();
  const deleteFile = useDeleteFile();
  const renameFile = useRenameFile();
  const duplicateFile = useDuplicateFile();

  const { currentFileId, setCurrentFile, setSidebarOpen, openAuth } = useEditorStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const filteredFiles = useMemo(() => {
    if (!files) {
      return [];
    }
    const q = search.trim().toLowerCase();
    if (!q) {
      return files;
    }
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

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

  async function handleDuplicate(id: string, name: string) {
    try {
      const copy = await duplicateFile.mutateAsync(id);
      toast.success(`Duplicated "${name}"`);
      setCurrentFile(copy.id, copy.name);
    } catch {
      toast.error("Could not duplicate the drawing.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const { id, name } = pendingDelete;
    setPendingDelete(null);
    await deleteFile.mutateAsync(id);
    if (currentFileId === id) {
      setCurrentFile(null, "Untitled");
    }
    toast.success(`Deleted "${name}"`);
  }

  return (
    <Sidebar
      name="my-drawings"
      className="w-80"
      onStateChange={(state) => setSidebarOpen(state !== null)}
    >
      <Sidebar.Header>
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">My drawings</span>
              {files && files.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal">
                  {files.length}
                </Badge>
              )}
            </div>
            {isAuthed ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreate}
                disabled={createFile.isPending}
                className="h-7 gap-1 px-2"
              >
                {createFile.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <FilePlus className="size-3" />
                )}
                New
              </Button>
            ) : (
              <UserAvatar
                name={session?.user?.name}
                email={session?.user?.email}
                className="size-7"
              />
            )}
          </div>
          {isAuthed && files && files.length >= MIN_FILES_FOR_SEARCH && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drawings…"
                className="h-8 pl-7 text-xs"
              />
            </div>
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
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : !files || files.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <FilePlus className="size-8 text-muted-foreground/50" />
          <p>
            No drawings yet. Click <span className="font-medium text-foreground">New</span> to
            create one.
          </p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No drawings match <span className="font-medium text-foreground">"{search}"</span>.
        </div>
      ) : (
        <div className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto p-2">
          {filteredFiles.map((file) => {
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
                      <DropdownMenuItem onSelect={() => handleDuplicate(file.id, file.name)}>
                        <Copy className="mr-2 size-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setPendingDelete({ id: file.id, name: file.name })}
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

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this drawing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">"{pendingDelete?.name}"</span> and its
              content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFile.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteFile.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFile.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
