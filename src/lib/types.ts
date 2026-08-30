/** Shared types used by both server and client (no server-only imports). */

export type FileSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
};

export type FileContent = {
  summary: FileSummary;
  data: string;
};
