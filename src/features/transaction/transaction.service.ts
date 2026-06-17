import { HTTPException } from "hono/http-exception";
import { DrizzleD1 } from "../../config/db";
import { deleteRecord, findManyWithIdPagination, insertRecord, updateRecord } from "../../lib/drizzle.d1";
import { TransactionInputType } from "./transaction.schema";
import { transactions } from "./transaction.table";
import { wallets } from "../wallet/wallet.table";
import { budgets } from "../budget/budget.table";
import { and, eq, inArray, like } from "drizzle-orm";

const adjustWalletBalance = async (db: DrizzleD1, user_id: string, wallet_id: string, amountChange: number) => {
    const result = await db.select()
        .from(wallets)
        .where(and(eq(wallets.id, wallet_id), eq(wallets.user_id, user_id), eq(wallets.is_deleted, false)))
        .limit(1);
    const wallet = result[0];
    if (!wallet) throw new HTTPException(404, { message: "Wallet not found." });

    const currentBalance = Number(wallet.balance) || 0;
    const newBalance = currentBalance + amountChange;

    await db.update(wallets)
        .set({ balance: newBalance.toString() })
        .where(eq(wallets.id, wallet_id));
};

export const createTransaction = async (db: DrizzleD1, user_id: string, data: TransactionInputType) => {
    // 1. Verify wallet exists & belongs to user
    const walletResult = await db.select()
        .from(wallets)
        .where(and(eq(wallets.id, data.wallet_id), eq(wallets.user_id, user_id), eq(wallets.is_deleted, false)))
        .limit(1);
    const wallet = walletResult[0];
    if (!wallet) throw new HTTPException(404, { message: "Wallet not found." });

    // 2. If budget_id is provided, verify budget exists & belongs to user
    if (data.budget_id) {
        const budgetResult = await db.select()
            .from(budgets)
            .where(and(eq(budgets.id, data.budget_id), eq(budgets.user_id, user_id), eq(budgets.is_deleted, false)))
            .limit(1);
        const budget = budgetResult[0];
        if (!budget) throw new HTTPException(404, { message: "Budget category not found." });
    }

    // 3. Insert transaction
    const result = await insertRecord(db, transactions, { ...data, user_id });
    if (!result) throw new HTTPException(400, { message: "Failed to create transaction." });

    // 4. Update wallet balance
    const amountChange = data.type === "IN" ? data.amount : -data.amount;
    await adjustWalletBalance(db, user_id, data.wallet_id, amountChange);

    return result;
};

export const getAllTransactions = async (
    db: DrizzleD1,
    user_id: string,
    options: { page?: number; limit?: number; wallet_id?: string; budget_id?: string; type?: "IN" | "OUT"; search?: string }
) => {
    let whereClause = and(
        eq(transactions.user_id, user_id),
        eq(transactions.is_deleted, false)
    );

    if (options.wallet_id) {
        whereClause = and(whereClause, eq(transactions.wallet_id, options.wallet_id));
    }
    if (options.budget_id) {
        whereClause = and(whereClause, eq(transactions.budget_id, options.budget_id));
    }
    if (options.type) {
        whereClause = and(whereClause, eq(transactions.type, options.type));
    }
    if (options.search) {
        whereClause = and(whereClause, like(transactions.description, `%${options.search}%`));
    }

    const result = await findManyWithIdPagination(
        db,
        transactions,
        whereClause,
        { page: options.page, limit: options.limit },
        async (currentIds) => {
            return await db
                .select()
                .from(transactions)
                .where(inArray(transactions.id, currentIds))
        }
    );

    return result;
};

export const updateTransaction = async (db: DrizzleD1, user_id: string, transaction_id: string, data: TransactionInputType) => {
    // 1. Fetch old transaction and verify ownership
    const txResult = await db.select()
        .from(transactions)
        .where(and(eq(transactions.id, transaction_id), eq(transactions.user_id, user_id), eq(transactions.is_deleted, false)))
        .limit(1);
    const oldTx = txResult[0];
    if (!oldTx) throw new HTTPException(404, { message: "Transaction not found." });

    // 2. Verify new wallet exists & belongs to user
    const walletResult = await db.select()
        .from(wallets)
        .where(and(eq(wallets.id, data.wallet_id), eq(wallets.user_id, user_id), eq(wallets.is_deleted, false)))
        .limit(1);
    const wallet = walletResult[0];
    if (!wallet) throw new HTTPException(404, { message: "Wallet not found." });

    // 3. If budget_id is provided, verify new budget exists & belongs to user
    if (data.budget_id) {
        const budgetResult = await db.select()
            .from(budgets)
            .where(and(eq(budgets.id, data.budget_id), eq(budgets.user_id, user_id), eq(budgets.is_deleted, false)))
            .limit(1);
        const budget = budgetResult[0];
        if (!budget) throw new HTTPException(404, { message: "Budget category not found." });
    }

    // 4. Revert old transaction balance changes
    const oldRevertAmount = oldTx.type === "IN" ? -oldTx.amount : oldTx.amount;
    // Apply new transaction balance changes
    const newAmountChange = data.type === "IN" ? data.amount : -data.amount;

    if (oldTx.wallet_id === data.wallet_id) {
        // Same wallet: total change is oldRevertAmount + newAmountChange
        const totalChange = oldRevertAmount + newAmountChange;
        if (totalChange !== 0) {
            await adjustWalletBalance(db, user_id, data.wallet_id, totalChange);
        }
    } else {
        // Different wallets: revert old wallet, apply to new wallet
        await adjustWalletBalance(db, user_id, oldTx.wallet_id, oldRevertAmount);
        await adjustWalletBalance(db, user_id, data.wallet_id, newAmountChange);
    }

    // 5. Update transaction record
    const result = await updateRecord(db, transactions, eq(transactions.id, transaction_id), data);
    if (!result) throw new HTTPException(400, { message: "Failed to update transaction." });

    return result;
};

export const deleteTransaction = async (db: DrizzleD1, user_id: string, transaction_id: string) => {
    // 1. Fetch old transaction and verify ownership
    const txResult = await db.select()
        .from(transactions)
        .where(and(eq(transactions.id, transaction_id), eq(transactions.user_id, user_id), eq(transactions.is_deleted, false)))
        .limit(1);
    const oldTx = txResult[0];
    if (!oldTx) throw new HTTPException(404, { message: "Transaction not found." });

    // 2. Revert wallet balance changes
    const oldRevertAmount = oldTx.type === "IN" ? -oldTx.amount : oldTx.amount;
    await adjustWalletBalance(db, user_id, oldTx.wallet_id, oldRevertAmount);

    // 3. Soft delete transaction record
    const result = await deleteRecord(db, transactions, and(eq(transactions.id, transaction_id), eq(transactions.is_deleted, false))!);
    if (!result) throw new HTTPException(400, { message: "Failed to delete transaction." });

    return result;
};
