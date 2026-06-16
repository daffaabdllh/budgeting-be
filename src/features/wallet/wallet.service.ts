import { HTTPException } from "hono/http-exception";
import { DrizzleD1 } from "../../config/db";
import { findManyWithIdPagination, insertRecord, updateRecord, deleteRecord } from "../../lib/drizzle.d1";
import { WalletInputType } from "./wallet.schema";
import { wallets } from "./wallet.table";
import { and, eq, inArray } from "drizzle-orm";

export const createWallet = async (db: DrizzleD1, user_id: string, data: WalletInputType) => {
    const result = await insertRecord(db, wallets, { ...data, user_id })
    if (!result) throw new HTTPException(400, { message: "Failed create new wallet." })

    return result
}

export const getAllWallets = async (db: DrizzleD1, user_id: string, limit?: number, page?: number) => {
    const result = await findManyWithIdPagination(
        db,
        wallets,
        and(eq(wallets.user_id, user_id), eq(wallets.is_deleted, false)),
        { page, limit },
        async (currentPageIds) => {
            return await db
                .select()
                .from(wallets)
                .where(inArray(wallets.id, currentPageIds))
        }
    )

    return result
}

export const updateWallet = async (db: DrizzleD1, wallet_id: string, data: WalletInputType) => {
    const result = await updateRecord(db, wallets, eq(wallets.id, wallet_id), data)
    if (!result) throw new HTTPException(400, { message: "Failed update wallet." })

    return result
}

export const deleteWallet = async (db: DrizzleD1, wallet_id: string) => {
    const result = await deleteRecord(db, wallets, and(eq(wallets.id, wallet_id), eq(wallets.is_deleted, false))!)
    if (!result) throw new HTTPException(400, { message: "Failed delete wallet." })
}