/** Shared types used by both server and client (no server-only imports). */

export type FileSummary = {
  id: string;
  name: string;
  /** Opaque sharing token; non-null means the drawing is publicly viewable. */
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
};

export type FileContent = {
  summary: FileSummary;
  data: string;
};

/** Public shape of a shared drawing (no owner info, no internal ids). */
export type SharedFile = {
  name: string;
  data: string;
};
