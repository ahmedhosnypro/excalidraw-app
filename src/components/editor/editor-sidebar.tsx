"use client";

import { useMemo, useState } from "react";
import { Sidebar } from "@excalidraw/excalidraw";
import { useSession } from "next-auth/react";
import { FilePlus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { useCreateFile, useDeleteFile, useFiles, useFolders } from "@/hooks/use-files";
import { useEditorStore } from "@/stores/editor-store";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/editor/user-avatar";
import { FileList } from "@/components/editor/file-list";
import { FolderManager } from "@/components/editor/folder-manager";
import { BatchActionsBar } from "@/components/editor/batch-actions-bar";

const MIN_FILES_FOR_SEARCH = 4;

export function EditorSidebar() {
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);
  const { data: files, isLoading } = useFiles(isAuthed);
  const { data: folders } = useFolders(isAuthed);
  const createFile = useCreateFile();
  const deleteFile = useDeleteFile();

  const {
    currentFileId,
    setCurrentFile,
    setSidebarOpen,
    openAuth,
    pendingDelete,
    setPendingDelete,
    folderFilter,
    selectedFileIds,
    clearSelection,
  } = useEditorStore();
  const [search, setSearch] = useState("");

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!files) {
      return counts;
    }
    for (const f of files) {
      if (f.folderId) {
        counts.set(f.folderId, (counts.get(f.folderId) ?? 0) + 1);
      }
    }
    return counts;
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (!files) {
      return [];
    }
    let result = files;
    if (folderFilter !== null) {
      result = result.filter((f) => f.folderId === folderFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    return result;
  }, [files, search, folderFilter]);

  async function handleCreate() {
    const file = await createFile.mutateAsync("Untitled");
    setCurrentFile(file.id, file.name);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const { id, name } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteFile.mutateAsync(id);
      if (currentFileId === id) {
        setCurrentFile(null, "Untitled");
      }
      toast.success(`Deleted "${name}"`);
    } catch {
      toast.error("Could not delete the drawing.");
    }
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
      ) : (
        <>
          {folders && folders.length > 0 && (
            <FolderManager folders={folders} counts={folderCounts} />
          )}
          {selectedFileIds.size > 0 && (
            <BatchActionsBar selectedIds={[...selectedFileIds]} onClear={clearSelection} />
          )}
          {isLoading ? (
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
              {search ? (
                <>
                  No drawings match <span className="font-medium text-foreground">"{search}"</span>.
                </>
              ) : (
                "No drawings in this folder."
              )}
            </div>
          ) : (
            <FileList files={filteredFiles} />
          )}
        </>
      )}

      {/* Delete confirmation is rendered here so it overlays even when the
          sidebar itself would unmount on file switch. */}
      {/* Note: AlertDialog is owned by the editor component for layering. */}
      {pendingDelete && (
        <DeleteConfirmation
          name={pendingDelete.name}
          pending={deleteFile.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </Sidebar>
  );
}

/** Inline AlertDialog for delete confirmation (keeps imports local to the sidebar). */
function DeleteConfirmation({
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this drawing?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">"{name}"</span> and its content. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
