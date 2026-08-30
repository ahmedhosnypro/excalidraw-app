import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Drizzle schema — currently targeting SQLite via @libsql/client.
 *
 * Scalability note: to migrate to PostgreSQL later, swap the table builders
 * (`sqliteTable` -> `pgTable`, `integer({mode:"timestamp"})` -> `timestamp()`)
 * and the client driver in `src/db/client.ts`. Column names and relations stay
 * identical, so application code does not change.
 */

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const files = sqliteTable(
  "files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Untitled"),
    /**
     * User-controlled sort order within the sidebar (ascending). New files get
     * the next sequential number so they appear last. Drag-to-reorder updates
     * this column.
     */
    sortOrder: integer("sort_order").notNull().default(0),
    /** Whether the user has starred (pinned) this drawing. */
    starred: integer("starred", { mode: "boolean" }).notNull().default(false),
    /**
     * Optional folder this drawing belongs to. Null = "All drawings" (root).
     * Folders are user-scoped; deleting a folder nulls this column (SET NULL)
     * so the drawings are not lost.
     */
    folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
    /**
     * Opaque sharing token. When non-null, the drawing is publicly viewable
     * (read-only) at `/?share=<token>`. Rotating or nulling the token revokes
     * any previously shared link.
     */
    shareToken: text("share_token"),
    /**
     * Optional expiry timestamp for the share link. When set, the public link
     * stops working after this time (without revoking the token — re-enabling
     * or extending is possible). Null = never expires.
     */
    shareExpiresAt: integer("share_expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    lastOpenedAt: integer("last_opened_at", { mode: "timestamp" }),
  },
  (table) => [
    index("files_user_id_idx").on(table.userId),
    index("files_folder_id_idx").on(table.folderId),
  ]
);

/**
 * User-owned folder for grouping drawings in the sidebar.
 * Simple flat structure (no nesting) to keep the UI scannable.
 */
export const folders = sqliteTable(
  "folders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("folders_user_id_idx").on(table.userId)]
);

/**
 * Snapshot of a drawing's content at a point in time, for version history.
 *
 * Content is stored as a separate storage blob keyed by the version id (not the
 * file id) so restoring an old version is a pure copy. Snapshots are created
 * opportunistically (throttled) when a save would overwrite meaningfully
 * different content; old versions are pruned to a cap per file.
 */
export const fileVersions = sqliteTable(
  "file_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    /** Size of the snapshot content in bytes (for display + pruning). */
    sizeBytes: integer("size_bytes").notNull().default(0),
  },
  (table) => [index("file_versions_file_id_idx").on(table.fileId)]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type FileVersion = typeof fileVersions.$inferSelect;
