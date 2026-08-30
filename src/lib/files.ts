import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/db/client";
import { fileVersions, files, folders } from "@/db/schema";
import { getStorageProvider } from "@/lib/storage";
import type {
  FileContent,
  FileSummary,
  FileVersionSummary,
  FolderSummary,
  SharedFile,
} from "@/lib/types";

/** Public shape of a file returned to the client (no internal columns). */
export type { FileSummary, FolderSummary } from "@/lib/types";

function toSummary(row: typeof files.$inferSelect): FileSummary {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    starred: row.starred,
    folderId: row.folderId,
    shareToken: row.shareToken,
    shareExpiresAt: row.shareExpiresAt ? row.shareExpiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastOpenedAt: row.lastOpenedAt ? row.lastOpenedAt.toISOString() : null,
  };
}

function toFolderSummary(row: typeof folders.$inferSelect): FolderSummary {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Returns the authenticated user's id, or a 401 NextResponse. */
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session.user.id;
}

function isUserId(value: string | NextResponse): value is string {
  return typeof value === "string";
}

export type FileContext = { userId: string; id: string };

/**
 * Resolve auth + the `id` route param for a per-file route handler.
 * Returns a `NextResponse` (401) when unauthenticated so handlers can early-return.
 */
async function resolveFileContext(context: {
  params: Promise<{ id: string }>;
}): Promise<FileContext | NextResponse> {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const { id } = await context.params;
  return { userId: auth, id };
}

function isFileContext(value: FileContext | NextResponse): value is FileContext {
  return !(value instanceof NextResponse);
}

type RouteContext = { params: Promise<{ id: string }> };
type RouteHandler = (request: Request, context: RouteContext) => Promise<NextResponse>;

/**
 * Wrap a per-file route handler with auth + id resolution. The handler receives
 * an authenticated `{ userId, id }` context; unauthenticated requests short-circuit
 * to a 401. Centralises the guard so route files stay free of auth boilerplate.
 */
export function withAuth(
  handler: (ctx: FileContext, request: Request) => Promise<NextResponse>
): RouteHandler {
  return async (request, context) => {
    const ctx = await resolveFileContext(context);
    if (!isFileContext(ctx)) {
      return ctx;
    }
    return handler(ctx, request);
  };
}

export function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Bad-request response for invalid input. */
function badRequest(message = "Invalid input"): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Resolve auth + an `id` route param for a generic per-id route handler (used
 * by folders, which aren't files). Returns `{ userId, id }` or a 401 response.
 */
export async function resolveAuthIdParam(context: {
  params: Promise<{ id: string }>;
}): Promise<{ userId: string; id: string } | NextResponse> {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const { id } = await context.params;
  return { userId: auth, id };
}

/** Type guard for the result of `resolveAuthIdParam`. */
export function isAuthIdParam(
  value: { userId: string; id: string } | NextResponse
): value is { userId: string; id: string } {
  return !(value instanceof NextResponse);
}

/** Parse + validate a JSON request body with a zod schema. Returns null on failure. */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest();
  }
  return { data: parsed.data };
}

export async function listFiles(userId: string): Promise<FileSummary[]> {
  const rows = await db
    .select()
    .from(files)
    .where(eq(files.userId, userId))
    .orderBy(
      desc(files.starred),
      asc(files.sortOrder),
      desc(files.lastOpenedAt),
      desc(files.updatedAt)
    );
  return rows.map(toSummary);
}

export async function createFile(userId: string, name?: string): Promise<FileSummary> {
  // Assign the next sort order so the new file appears last in the sidebar.
  const maxRow = await db
    .select({ maxOrder: files.sortOrder })
    .from(files)
    .where(eq(files.userId, userId))
    .orderBy(desc(files.sortOrder))
    .limit(1);
  const nextOrder = (maxRow[0]?.maxOrder ?? -1) + 1;

  const [row] = await db
    .insert(files)
    .values({ userId, name: name?.trim() || "Untitled", sortOrder: nextOrder })
    .returning();
  if (!row) {
    throw new Error("Failed to create file");
  }
  return toSummary(row);
}

/** Maximum drawings a single user can have (abuse prevention). */
const MAX_FILES_PER_USER = 200;

/** Count a user's drawings (for the limit check). */
export async function countFiles(userId: string): Promise<number> {
  const rows = await db.select({ id: files.id }).from(files).where(eq(files.userId, userId));
  return rows.length;
}

export const FILE_LIMIT = MAX_FILES_PER_USER;

export async function getFile(userId: string, fileId: string): Promise<FileSummary | null> {
  const [row] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)));
  return row ? toSummary(row) : null;
}

export async function renameFile(
  userId: string,
  fileId: string,
  name: string
): Promise<FileSummary | null> {
  const [row] = await db
    .update(files)
    .set({ name: name.trim() || "Untitled" })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .returning();
  return row ? toSummary(row) : null;
}

export async function touchFile(userId: string, fileId: string): Promise<void> {
  await db
    .update(files)
    .set({ lastOpenedAt: new Date() })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)));
}

export async function deleteFile(userId: string, fileId: string): Promise<boolean> {
  const [row] = await db
    .delete(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .returning({ id: files.id });
  if (!row) {
    return false;
  }
  try {
    await getStorageProvider().remove(fileId);
  } catch {
    // Metadata is gone; orphaned content is acceptable (storage layer is best-effort here).
  }
  return true;
}

export async function saveContent(userId: string, fileId: string, data: string): Promise<boolean> {
  const owned = await getFile(userId, fileId);
  if (!owned) {
    return false;
  }
  // Snapshot the previous content before overwriting, so it's recoverable via
  // version history. Only snapshot when the content actually differs (avoids
  // filling history with no-op saves from the debounced autosave).
  const existing = await getStorageProvider().load(fileId);
  if (existing !== null && existing !== data) {
    const [version] = await db
      .insert(fileVersions)
      .values({ fileId, sizeBytes: Buffer.byteLength(existing, "utf8") })
      .returning();
    if (version) {
      await getStorageProvider().save(`v-${version.id}`, existing);
      await pruneVersions(fileId);
    }
  }
  await getStorageProvider().save(fileId, data);
  await db
    .update(files)
    .set({ updatedAt: new Date() })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)));
  return true;
}

export async function loadContent(userId: string, fileId: string): Promise<FileContent | null> {
  const summary = await getFile(userId, fileId);
  if (!summary) {
    return null;
  }
  const data = await getStorageProvider().load(fileId);
  return { summary, data: data ?? "" };
}

/**
 * Duplicate a drawing: copy its metadata (with a " (copy)" suffix on the name)
 * and clone its scene content into a new storage blob. Returns the new file
 * summary, or `null` if the source does not exist or is not owned by the user.
 */
export async function duplicateFile(userId: string, fileId: string): Promise<FileSummary | null> {
  const source = await getFile(userId, fileId);
  if (!source) {
    return null;
  }
  const copy = await createFile(userId, `${source.name} (copy)`);
  const data = await getStorageProvider().load(fileId);
  if (data) {
    await getStorageProvider().save(copy.id, data);
  }
  return copy;
}

/**
 * Enable public read-only sharing for a drawing. Generates (or rotates) the
 * share token. Optionally sets an expiry (null = never expires). Returns the
 * updated summary with the new token, or `null` if the file does not exist /
 * is not owned by the user.
 */
export async function enableShare(
  userId: string,
  fileId: string,
  expiresAt: Date | null = null
): Promise<FileSummary | null> {
  const token = crypto.randomUUID();
  const [row] = await db
    .update(files)
    .set({ shareToken: token, shareExpiresAt: expiresAt })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .returning();
  return row ? toSummary(row) : null;
}

/**
 * Revoke public sharing for a drawing (clears the token). Any previously
 * shared link stops working immediately. Returns the updated summary, or
 * `null` if the file is not owned by the user.
 */
export async function revokeShare(userId: string, fileId: string): Promise<FileSummary | null> {
  const [row] = await db
    .update(files)
    .set({ shareToken: null, shareExpiresAt: null })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .returning();
  return row ? toSummary(row) : null;
}

/**
 * Load a publicly shared drawing by its share token. No auth required — this
 * is the only file-access function callable without a session. Returns the
 * drawing name + scene content, or `null` if no drawing matches the token,
 * sharing was revoked, or the share link has expired.
 */
export async function getSharedFile(token: string): Promise<SharedFile | null> {
  const [row] = await db
    .select({
      id: files.id,
      name: files.name,
      shareToken: files.shareToken,
      shareExpiresAt: files.shareExpiresAt,
    })
    .from(files)
    .where(eq(files.shareToken, token));
  if (!row) {
    return null;
  }
  if (row.shareExpiresAt && row.shareExpiresAt.getTime() <= Date.now()) {
    return null;
  }
  const data = await getStorageProvider().load(row.id);
  return { name: row.name, data: data ?? "" };
}

// ─── Version history ────────────────────────────────────────────────────────

const MAX_VERSIONS_PER_FILE = 20;

function toVersionSummary(row: typeof fileVersions.$inferSelect): FileVersionSummary {
  return {
    id: row.id,
    fileId: row.fileId,
    createdAt: row.createdAt.toISOString(),
    sizeBytes: row.sizeBytes,
  };
}

/**
 * Create a version snapshot of a drawing's current content. Called before a
 * save overwrites the live content, so the previous state is recoverable.
 * Prunes the oldest versions beyond the per-file cap. No-op if the file is not
 * owned by the user.
 */
export async function createVersionSnapshot(userId: string, fileId: string): Promise<void> {
  const owned = await getFile(userId, fileId);
  if (!owned) {
    return;
  }
  const data = await getStorageProvider().load(fileId);
  if (!data) {
    return;
  }
  const [version] = await db
    .insert(fileVersions)
    .values({ fileId, sizeBytes: Buffer.byteLength(data, "utf8") })
    .returning();
  if (version) {
    await getStorageProvider().save(`v-${version.id}`, data);
  }
  await pruneVersions(fileId);
}

/** Prune oldest versions beyond the per-file cap. */
async function pruneVersions(fileId: string): Promise<void> {
  const all = await db
    .select({ id: fileVersions.id })
    .from(fileVersions)
    .where(eq(fileVersions.fileId, fileId))
    .orderBy(desc(fileVersions.createdAt));
  if (all.length <= MAX_VERSIONS_PER_FILE) {
    return;
  }
  const toRemove = all.slice(MAX_VERSIONS_PER_FILE);
  for (const v of toRemove) {
    try {
      await getStorageProvider().remove(`v-${v.id}`);
    } catch {
      // best-effort cleanup
    }
    await db.delete(fileVersions).where(eq(fileVersions.id, v.id));
  }
}

/** List all version snapshots for a drawing, newest first. */
export async function listVersions(
  userId: string,
  fileId: string
): Promise<FileVersionSummary[] | null> {
  const owned = await getFile(userId, fileId);
  if (!owned) {
    return null;
  }
  const rows = await db
    .select()
    .from(fileVersions)
    .where(eq(fileVersions.fileId, fileId))
    .orderBy(desc(fileVersions.createdAt));
  return rows.map(toVersionSummary);
}

/** Load the scene content of a specific version snapshot. */
export async function getVersionContent(
  userId: string,
  fileId: string,
  versionId: string
): Promise<(FileVersionSummary & { data: string }) | null> {
  const owned = await getFile(userId, fileId);
  if (!owned) {
    return null;
  }
  const [version] = await db
    .select()
    .from(fileVersions)
    .where(and(eq(fileVersions.id, versionId), eq(fileVersions.fileId, fileId)));
  if (!version) {
    return null;
  }
  const data = await getStorageProvider().load(`v-${version.id}`);
  return { ...toVersionSummary(version), data: data ?? "" };
}

/**
 * Restore a drawing to a previous version: snapshot the current content (so the
 * restore point itself is recoverable), then overwrite the live content with
 * the version's snapshot. Returns the updated file summary, or `null` if the
 * version/file is not found or not owned.
 */
export async function restoreVersion(
  userId: string,
  fileId: string,
  versionId: string
): Promise<FileSummary | null> {
  const versionData = await getVersionContent(userId, fileId, versionId);
  if (!versionData) {
    return null;
  }
  await createVersionSnapshot(userId, fileId);
  await getStorageProvider().save(fileId, versionData.data);
  const [row] = await db
    .update(files)
    .set({ updatedAt: new Date() })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .returning();
  return row ? toSummary(row) : null;
}

// ─── Folders ────────────────────────────────────────────────────────────────

/** List all folders owned by the user, alphabetically. */
export async function listFolders(userId: string): Promise<FolderSummary[]> {
  const rows = await db
    .select()
    .from(folders)
    .where(eq(folders.userId, userId))
    .orderBy(asc(folders.name));
  return rows.map(toFolderSummary);
}

/** Create a new folder. Name is trimmed; duplicates are allowed. */
export async function createFolder(userId: string, name: string): Promise<FolderSummary> {
  const [row] = await db
    .insert(folders)
    .values({ userId, name: name.trim() || "New folder" })
    .returning();
  if (!row) {
    throw new Error("Failed to create folder");
  }
  return toFolderSummary(row);
}

/** Rename a folder. Returns null if not owned by the user. */
export async function renameFolder(
  userId: string,
  folderId: string,
  name: string
): Promise<FolderSummary | null> {
  const [row] = await db
    .update(folders)
    .set({ name: name.trim() || "Untitled" })
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning();
  return row ? toFolderSummary(row) : null;
}

/**
 * Delete a folder. Drawings inside are moved to root (folderId set to null via
 * the schema's ON DELETE SET NULL). Returns true if the folder was deleted.
 */
export async function deleteFolder(userId: string, folderId: string): Promise<boolean> {
  const [row] = await db
    .delete(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning({ id: folders.id });
  return Boolean(row);
}

/**
 * Move a drawing to a folder (or to root when folderId is null). Validates
 * ownership of both the file and the target folder. Returns the updated summary,
 * or null if the file/folder is not owned.
 */
export async function moveFile(
  userId: string,
  fileId: string,
  folderId: string | null
): Promise<FileSummary | null> {
  const owned = await getFile(userId, fileId);
  if (!owned) {
    return null;
  }
  if (!(await folderOwned(userId, folderId))) {
    return null;
  }
  const [row] = await db
    .update(files)
    .set({ folderId })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .returning();
  return row ? toSummary(row) : null;
}

/** Check that a folder belongs to the user (or is null = root). */
async function folderOwned(userId: string, folderId: string | null): Promise<boolean> {
  if (folderId === null) {
    return true;
  }
  const [folder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)));
  return Boolean(folder);
}

/**
 * Reorder drawings by updating their `sortOrder`. Accepts an ordered list of
 * file ids (the desired order) and reassigns sequential sort orders (0..n).
 * Only files owned by the user are affected. No-op for empty lists.
 */
export async function reorderFiles(userId: string, orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }
  // Reassign sequential orders in a single pass — each update is scoped to the
  // user's own files, so a malicious id in the list is silently ignored.
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(files)
      .set({ sortOrder: i })
      .where(and(eq(files.id, orderedIds[i]), eq(files.userId, userId)));
  }
}

/** Toggle the starred (pinned) flag on a drawing. Returns the updated summary or null. */
export async function toggleStar(userId: string, fileId: string): Promise<FileSummary | null> {
  const owned = await getFile(userId, fileId);
  if (!owned) {
    return null;
  }
  const [row] = await db
    .update(files)
    .set({ starred: !owned.starred })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .returning();
  return row ? toSummary(row) : null;
}

// ─── Batch operations ──────────────────────────────────────────────────────

/** Maximum number of files a single batch operation can target. */
const MAX_BATCH = 50;

/**
 * Delete multiple drawings at once. Only files owned by the user are affected;
 * foreign ids in the list are silently skipped. Returns the count actually
 * deleted. Capped at MAX_BATCH per call.
 */
export async function batchDeleteFiles(userId: string, fileIds: string[]): Promise<number> {
  const ids = fileIds.slice(0, MAX_BATCH);
  const deleted = await db
    .delete(files)
    .where(and(eq(files.userId, userId), inArray(files.id, ids)))
    .returning({ id: files.id });
  for (const row of deleted) {
    try {
      await getStorageProvider().remove(row.id);
    } catch {
      // best-effort content cleanup
    }
  }
  return deleted.length;
}

/**
 * Move multiple drawings to a folder (or root). Only files owned by the user
 * are affected. Returns the count actually moved. Capped at MAX_BATCH.
 */
export async function batchMoveFiles(
  userId: string,
  fileIds: string[],
  folderId: string | null
): Promise<number> {
  const ids = fileIds.slice(0, MAX_BATCH);
  if (!(await folderOwned(userId, folderId))) {
    return 0;
  }
  const moved = await db
    .update(files)
    .set({ folderId })
    .where(and(eq(files.userId, userId), inArray(files.id, ids)))
    .returning({ id: files.id });
  return moved.length;
}

/**
 * Toggle the starred flag on multiple drawings. Only files owned by the user
 * are affected. Returns the count actually updated. Capped at MAX_BATCH.
 */
export async function batchStarFiles(
  userId: string,
  fileIds: string[],
  starred: boolean
): Promise<number> {
  const ids = fileIds.slice(0, MAX_BATCH);
  const updated = await db
    .update(files)
    .set({ starred })
    .where(and(eq(files.userId, userId), inArray(files.id, ids)))
    .returning({ id: files.id });
  return updated.length;
}

// ─── Storage usage ──────────────────────────────────────────────────────────

/** Aggregate storage usage for a user (total bytes + file count). */
export async function getStorageUsage(userId: string): Promise<{ bytes: number; count: number }> {
  const rows = await db
    .select({ sizeBytes: fileVersions.sizeBytes })
    .from(fileVersions)
    .innerJoin(files, eq(fileVersions.fileId, files.id))
    .where(eq(files.userId, userId));
  let versionBytes = 0;
  for (const row of rows) {
    versionBytes += row.sizeBytes;
  }
  const userFiles = await db.select({ id: files.id }).from(files).where(eq(files.userId, userId));
  let liveBytes = 0;
  const storage = getStorageProvider();
  for (const f of userFiles) {
    const content = await storage.load(f.id);
    if (content) {
      liveBytes += Buffer.byteLength(content, "utf8");
    }
  }
  return { bytes: liveBytes + versionBytes, count: userFiles.length };
}

// ─── Content search ────────────────────────────────────────────────────────

export type SearchResult = {
  fileId: string;
  name: string;
  /** Excerpt of the matching text (text elements only), or null for structural matches. */
  snippet: string | null;
  updatedAt: string;
};

/**
 * Search across drawing content (text inside text elements). Loads each file's
 * scene JSON and greps for the query in any text element's `text` property.
 * Returns matches with a short snippet. No external index — fine for typical
 * libraries (a few hundred drawings); could be upgraded to FTS later.
 */
export async function searchFileContents(userId: string, query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  const userFiles = await db
    .select()
    .from(files)
    .where(eq(files.userId, userId))
    .orderBy(desc(files.lastOpenedAt));
  const storage = getStorageProvider();
  const results: SearchResult[] = [];
  for (const file of userFiles) {
    const content = await storage.load(file.id);
    if (!content) {
      continue;
    }
    try {
      const parsed = JSON.parse(content) as { elements?: Array<{ type?: string; text?: string }> };
      const textElements = (parsed.elements ?? []).filter(
        (el) => el.type === "text" && typeof el.text === "string"
      );
      for (const el of textElements) {
        if (el.text?.toLowerCase().includes(q)) {
          results.push({
            fileId: file.id,
            name: file.name,
            snippet: makeSnippet(el.text, q),
            updatedAt: file.updatedAt.toISOString(),
          });
          break;
        }
      }
    } catch {
      // skip unparseable content
    }
  }
  return results;
}

/** Build a short snippet around the first match, highlighting nothing (client handles display). */
function makeSnippet(text: string, query: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) {
    return text.slice(0, 80);
  }
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 40);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end) + suffix;
}

// ─── Recently opened ────────────────────────────────────────────────────────

/** Return the N most recently opened drawings (by lastOpenedAt, then updatedAt). */
export async function listRecentFiles(userId: string, limit = 5): Promise<FileSummary[]> {
  const rows = await db
    .select()
    .from(files)
    .where(and(eq(files.userId, userId), sql`${files.lastOpenedAt} IS NOT NULL`))
    .orderBy(desc(files.lastOpenedAt))
    .limit(limit);
  return rows.map(toSummary);
}

export { isUserId };
