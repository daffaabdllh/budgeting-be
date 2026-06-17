import { integer, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const budgets = sqliteTable("budgets", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id").notNull(),
    category: text("category").notNull(),
    amount: integer("amount").notNull(),
    month_year: text("month_year").notNull(),
    is_deleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    created_at: text("created_at")
        .notNull()
        .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updated_at: text("updated_at"),
    deleted_at: text("deleted_at")
}, (table) => {
    return {
        idxBudgetIsDeleted: index("idx_budget_is_deleted").on(table.is_deleted),
        idxBudgetUserId: index("idx_budget_user_id").on(table.user_id),
        idxBudgetAll: index("idx_budget_all").on(table.user_id, table.month_year, table.category),
        idxUniqueCategory: uniqueIndex("idx_unique_category").on(table.user_id, table.month_year, table.category)
    }
});

// ── Inferred Types ─────────────────────────────────────────────────────────────
export type BudgetSelect = typeof budgets.$inferSelect;
export type BudgetInsert = typeof budgets.$inferInsert;
