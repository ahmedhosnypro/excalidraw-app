/** Shared types used by both server and client (no server-only imports). */

export type FileSummary = {
  id: string;
  name: string;
  /** User-controlled sort order (ascending). */
  sortOrder: number;
  /** Whether the user has starred (pinned) this drawing. */
  starred: boolean;
  /** Optional folder this drawing belongs to (null = root). */
  folderId: string | null;
  /** Opaque sharing token; non-null means the drawing is publicly viewable. */
  shareToken: string | null;
  /** Optional share-link expiry (ISO string); null = never expires. */
  shareExpiresAt: string | null;
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

/** Public shape of a drawing version snapshot. */
export type FileVersionSummary = {
  id: string;
  fileId: string;
  createdAt: string;
  sizeBytes: number;
};

/** Public shape of a user-owned folder. */
export type FolderSummary = {
  id: string;
  name: string;
  createdAt: string;
};
