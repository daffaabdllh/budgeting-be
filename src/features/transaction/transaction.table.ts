import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const transactions = sqliteTable("transactions", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id").notNull(),
    wallet_id: text("wallet_id").notNull(),
    budget_id: text("budget_id"),
    type: text("type").$type<"IN" | "OUT">().notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    transaction_date: text("transaction_date").notNull(),
    is_deleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    created_at: text("created_at")
        .notNull()
        .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text("updated_at"),
    deleted_at: text("deleted_at")
}, (table) => {
    return {
        idxTransactionIsDeleted: index("idx_transaction_is_deleted").on(table.is_deleted),
        idxTransactionUserId: index("idx_transaction_user_id").on(table.user_id),
        idxTransactionWalletId: index("idx_transaction_wallet_id").on(table.wallet_id),
        idxTransactionBudgetId: index("idx_transaction_budget_id").on(table.budget_id),
        idxTransactionDate: index("idx_transaction_date").on(table.transaction_date)
    }
});

// ── Inferred Types ─────────────────────────────────────────────────────────────
export type TransactionSelect = typeof transactions.$inferSelect;
export type TransactionInsert = typeof transactions.$inferInsert;
