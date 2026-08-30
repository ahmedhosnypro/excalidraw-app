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
