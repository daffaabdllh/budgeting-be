// src/database/schema/users.schema.ts
import { integer, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const wallets = sqliteTable("wallets", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id").notNull(),
    name: text("name").notNull(),
    balance: text("balance").notNull(),
    is_deleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    created_at: text("created_at")
        .notNull()
        .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text("updated_at"),
    deleted_at: text("deleted_at")
}, (table) => {
    return {
        idxUniqueUserWalletName: uniqueIndex("idx_unique_user_wallet_name").on(sql`${table.name} COLLATE NOCASE`, table.user_id),
        idxWalletIsDeleted: index("idx_wallet_is_deleted").on(table.is_deleted),
        idxWalletUserId: index("idx_wallet_user_id").on(table.user_id),
    }
});

// ── Inferred Types ─────────────────────────────────────────────────────────────
export type WalletSelect = typeof wallets.$inferSelect;
export type WalletInsert = typeof wallets.$inferInsert;
