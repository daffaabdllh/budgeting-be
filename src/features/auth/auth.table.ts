import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const passwordResets = sqliteTable("password_resets", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    expires_at: integer("expires_at").notNull(), // Unix timestamp in seconds
    created_at: integer("created_at").default(sql`(strftime('%s', 'now'))`),
}, (table) => {
    return {
        idxPasswordResetsEmail: index("idx_password_resets_email").on(table.email),
    }
});
