"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FileSummary } from "@/lib/types";

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

export function useEnableShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<FileSummary>(fetch(`/api/files/${id}/share`, { method: "POST" })),
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
