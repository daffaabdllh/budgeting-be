// src/database/schema/users.schema.ts
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone_number: text("phone_number").notNull(),
    password: text("password").notNull(),
    salary_day: integer("salary_day").notNull().default(1),
    created_at: text("created_at")
        .notNull()
        .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (table) => {
    return {
        idxUsersEmailUnique: uniqueIndex("idx_users_email_unique").on(sql`${table.email} COLLATE NOCASE`),
        idxUsersPhoneNumberUnique: uniqueIndex("idx_users_phone_number_unique").on(sql`${table.phone_number} COLLATE NOCASE`),
    }
});

// ── Inferred Types ─────────────────────────────────────────────────────────────
export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
