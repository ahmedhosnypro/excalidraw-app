import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/db/client";
import { fileVersions, files } from "@/db/schema";
import { getStorageProvider } from "@/lib/storage";
import type { FileContent, FileSummary, FileVersionSummary, SharedFile } from "@/lib/types";

/** Public shape of a file returned to the client (no internal columns). */
export type { FileSummary } from "@/lib/types";

function toSummary(row: typeof files.$inferSelect): FileSummary {
  return {
    id: row.id,
    name: row.name,
    shareToken: row.shareToken,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastOpenedAt: row.lastOpenedAt ? row.lastOpenedAt.toISOString() : null,
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

export async function listFiles(userId: string): Promise<FileSummary[]> {
  const rows = await db
    .select()
    .from(files)
    .where(eq(files.userId, userId))
    .orderBy(desc(files.lastOpenedAt), desc(files.updatedAt));
  return rows.map(toSummary);
}

export async function createFile(userId: string, name?: string): Promise<FileSummary> {
  const [row] = await db
    .insert(files)
    .values({ userId, name: name?.trim() || "Untitled" })
    .returning();
  if (!row) {
    throw new Error("Failed to create file");
  }
  return toSummary(row);
}

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
 * share token. Returns the updated summary with the new token, or `null` if
 * the file does not exist / is not owned by the user.
 */
export async function enableShare(userId: string, fileId: string): Promise<FileSummary | null> {
  const token = crypto.randomUUID();
  const [row] = await db
    .update(files)
    .set({ shareToken: token })
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
    .set({ shareToken: null })
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .returning();
  return row ? toSummary(row) : null;
}

/**
 * Load a publicly shared drawing by its share token. No auth required — this
 * is the only file-access function callable without a session. Returns the
 * drawing name + scene content, or `null` if no drawing matches the token
 * (or sharing was revoked).
 */
export async function getSharedFile(token: string): Promise<SharedFile | null> {
  const [row] = await db
    .select({ id: files.id, name: files.name, shareToken: files.shareToken })
    .from(files)
    .where(eq(files.shareToken, token));
  if (!row) {
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

export { isUserId };
