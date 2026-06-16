import { type SQLiteTable, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { DrizzleD1 } from "../config/db"
import { SQL } from "drizzle-orm";

export const insertRecord = async <TTable extends SQLiteTable>(
    db: DrizzleD1,
    table: TTable,
    values: any
) => {
    const result = await db.insert(table).values(values).returning();
    return result[0];
};

export const findFirst = async <TTable extends SQLiteTable>(
    db: DrizzleD1,
    table: TTable,
    select: any,
    where: SQL | undefined
) => {
    const result = await db.select(select).from(table).where(where).limit(1)
    return result[0]
}