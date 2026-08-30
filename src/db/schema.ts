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
     * Opaque sharing token. When non-null, the drawing is publicly viewable
     * (read-only) at `/?share=<token>`. Rotating or nulling the token revokes
     * any previously shared link.
     */
    shareToken: text("share_token"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    lastOpenedAt: integer("last_opened_at", { mode: "timestamp" }),
  },
  (table) => [index("files_user_id_idx").on(table.userId)]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
