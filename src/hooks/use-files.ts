"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FileSummary, FileVersionSummary, FolderSummary, SearchResult } from "@/lib/types";

async function json<T>(resPromise: Promise<Response>): Promise<T> {
  const res = await resPromise;
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function useFiles(enabled = true) {
  return useQuery({
    queryKey: ["files"],
    queryFn: () => json<FileSummary[]>(fetch("/api/files")),
    enabled,
  });
}

export function useCreateFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) =>
      json<FileSummary>(
        fetch("/api/files", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<{ ok: boolean }>(fetch(`/api/files/${id}`, { method: "DELETE" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useRenameFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      json<FileSummary>(
        fetch(`/api/files/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useDuplicateFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<FileSummary>(fetch(`/api/files/${id}/duplicate`, { method: "POST" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useToggleStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<FileSummary>(fetch(`/api/files/${id}/star`, { method: "POST" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useReorderFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      json<{ ok: boolean }>(
        fetch("/api/files/reorder", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export type BatchAction = "delete" | "move" | "star" | "unstar";

export function useBatchAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      action,
      fileIds,
      folderId,
    }: {
      action: BatchAction;
      fileIds: string[];
      folderId?: string | null;
    }) =>
      json<{ ok: boolean; count: number }>(
        fetch("/api/files/batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, fileIds, folderId }),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["storage-usage"] });
    },
  });
}

export function useStorageUsage(enabled = true) {
  return useQuery({
    queryKey: ["storage-usage"],
    queryFn: () => json<{ bytes: number; count: number }>(fetch("/api/storage-usage")),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useEnableShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, expiresInHours }: { fileId: string; expiresInHours: number | null }) =>
      json<FileSummary>(
        fetch(`/api/files/${fileId}/share`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expiresInHours }),
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<FileSummary>(fetch(`/api/files/${id}/share`, { method: "DELETE" })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

/** Fetch a publicly shared drawing (no auth). Returns name + scene JSON. */
export async function fetchSharedFile(
  token: string
): Promise<{ name: string; data: string } | null> {
  const res = await fetch(`/api/shared/${token}`);
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as { name: string; data: string };
}

// ─── Version history ────────────────────────────────────────────────────────

export function useVersions(fileId: string | null) {
  return useQuery({
    queryKey: ["versions", fileId],
    queryFn: () => json<FileVersionSummary[]>(fetch(`/api/files/${fileId}/versions`)),
    enabled: Boolean(fileId),
  });
}

export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) =>
      json<FileVersionSummary[]>(fetch(`/api/files/${fileId}/versions`, { method: "POST" })),
    onSuccess: (_data, fileId) => qc.invalidateQueries({ queryKey: ["versions", fileId] }),
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, versionId }: { fileId: string; versionId: string }) =>
      json<FileSummary>(fetch(`/api/files/${fileId}/versions/${versionId}`, { method: "POST" })),
    onSuccess: (_data, { fileId }) => {
      qc.invalidateQueries({ queryKey: ["versions", fileId] });
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["file-content", fileId] });
    },
  });
}

/**
 * Lazy-load a single file's scene content (used for sidebar thumbnails).
 * Stale for 5 min so re-renders don't refetch; disabled when the file id is null.
 */
export function useFileContent(id: string | null) {
  return useQuery({
    queryKey: ["file-content", id],
    queryFn: async () => loadFileContent(id ?? ""),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

export async function loadFileContent(id: string): Promise<string> {
  const res = await fetch(`/api/files/${id}/content`);
  if (!res.ok) {
    return "";
  }
  const { data } = (await res.json()) as { data: string };
  return data ?? "";
}

export async function saveFileContent(id: string, data: string): Promise<boolean> {
  const res = await fetch(`/api/files/${id}/content`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export async function touchFile(id: string): Promise<void> {
  await fetch(`/api/files/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ touch: true }),
  });
}

// ─── Folders ────────────────────────────────────────────────────────────────

export function useFolders(enabled = true) {
  return useQuery({
    queryKey: ["folders"],
    queryFn: () => json<FolderSummary[]>(fetch("/api/folders")),
    enabled,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      json<FolderSummary>(
        fetch("/api/folders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      json<FolderSummary>(
        fetch(`/api/folders/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folders"] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<{ ok: boolean }>(fetch(`/api/folders/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useMoveFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: string; folderId: string | null }) =>
      json<FileSummary>(
        fetch(`/api/files/${fileId}/move`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ folderId }),
        })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

// ─── Account settings ───────────────────────────────────────────────────────

export function useUpdateName() {
  return useMutation({
    mutationFn: (name: string) =>
      json<{ name: string }>(
        fetch("/api/account/name", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        })
      ),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) =>
      json<{ ok: boolean }>(
        fetch("/api/account/password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        })
      ),
  });
}

// ─── Content search + recent ────────────────────────────────────────────────

export function useContentSearch() {
  return useMutation({
    mutationFn: (query: string) =>
      json<SearchResult[]>(
        fetch("/api/files/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query }),
        })
      ),
  });
}

export function useRecentFiles(enabled = true) {
  return useQuery({
    queryKey: ["recent-files"],
    queryFn: () => json<FileSummary[]>(fetch("/api/files/recent")),
    enabled,
    staleTime: 60 * 1000,
  });
}
