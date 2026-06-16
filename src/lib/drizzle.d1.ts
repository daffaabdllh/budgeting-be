import { type SQLiteTable, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { DrizzleD1 } from "../config/db"
import { sql, SQL } from "drizzle-orm";

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

export const updateRecord = async <TTable extends SQLiteTable>(
    db: DrizzleD1,
    table: TTable,
    where: SQL,
    values: any
) => {
    const updateValues: Record<string, any> = { ...values };
    if ("updated_at" in table) {
        updateValues.updated_at = new Date().toISOString();
    }
    const result = await db.update(table as any).set(updateValues).where(where).returning() as any;
    return result[0];
}

export const deleteRecord = async <TTable extends SQLiteTable>(
    db: DrizzleD1,
    table: TTable,
    where: SQL
) => {
    const deleteValues: Record<string, any> = {
        is_deleted: true
    };
    if ("deleted_at" in table) deleteValues.deleted_at = new Date().toISOString();

    const result = await db.update(table as any).set(deleteValues).where(where).returning() as any;
    return result[0];
}

interface PaginationOptions {
    page?: number;
    limit?: number;
    idKey?: string;
    sortColumn?: string;
    sortOrder?: "asc" | "desc";
}

export const findManyWithIdPagination = async <
    TTable extends SQLiteTable,
    TCallback extends (currentPageIds: any[]) => Promise<any[]>
>(
    db: any,
    table: TTable,
    where: SQL | undefined,
    options: PaginationOptions,
    fetchDataCallback: TCallback
) => {
    const { page = 1, limit = 10, idKey = "id" } = options;
    const offset = (page - 1) * limit;
    const fetchLimit = limit + 1;

    const getIdFromRow = (row: any): string => {
        if (!row) return "";
        if (row[idKey]) return row[idKey];
        // Jika object hasil join (bentuknya { products: {...}, categories: {...} })
        for (const key of Object.keys(row)) {
            if (row[key] && typeof row[key] === "object" && idKey in row[key]) {
                return row[key][idKey];
            }
        }
        return "";
    };

    // 1. QUERY AMBIL ID TERPAGINASI SEBAGAI SUBQUERY
    const idColumn = table[idKey as keyof typeof table] as AnySQLiteColumn;
    const pageIdsSubquery = db
        .select({ id: idColumn })
        .from(table)
        .where(where)
        .limit(fetchLimit)
        .offset(offset);

    // 2. PANGGIL CALLBACK LANGSUNG DENGAN SUBQUERY
    // Ini akan dieksekusi sebagai single SQL query di SQLite (1 RPC)
    const rawData = await fetchDataCallback(pageIdsSubquery as any);

    // Trace unique IDs dari data yang dikembalikan untuk menentukan hasNextPage & slicing
    const uniqueIds: string[] = [];
    const idSet = new Set<string>();
    for (const row of rawData) {
        const id = getIdFromRow(row);
        if (id && !idSet.has(id)) {
            idSet.add(id);
            uniqueIds.push(id);
        }
    }

    const hasNextPage = uniqueIds.length > limit;
    let slicedData = rawData;
    if (hasNextPage) {
        const allowedIds = new Set(uniqueIds.slice(0, limit));
        slicedData = rawData.filter((row: any) => allowedIds.has(getIdFromRow(row)));
    }

    // Urutkan data hasil JOIN di memori agar konsisten dengan urutan ID Paginasi
    if (slicedData.length > 0) {
        slicedData.sort((a: any, b: any) => {
            return uniqueIds.indexOf(getIdFromRow(a)) - uniqueIds.indexOf(getIdFromRow(b));
        });
    }

    return {
        data: slicedData,
        pagination: { page, limit, hasNextPage }
    };
};;