import { HTTPException } from "hono/http-exception";
import { DrizzleD1 } from "../../config/db";
import { deleteRecord, findManyWithIdPagination, insertRecord, updateRecord } from "../../lib/drizzle.d1";
import { TransactionInputType, TransferInputType } from "./transaction.schema";
import { transactions } from "./transaction.table";
import { wallets } from "../wallet/wallet.table";
import { budgets } from "../budget/budget.table";
import { and, eq, inArray, like, isNull, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

const linkedTransactions = alias(transactions, "linked_transactions");
const linkedWallets = alias(wallets, "linked_wallets");

const adjustWalletBalance = async (db: DrizzleD1, wallet_id: string, amountChange: number) => {
    await db.update(wallets)
        .set({
            balance: sql`CAST(${wallets.balance} AS REAL) + ${amountChange}`
        })
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

    // 1.5. If type is OUT, verify sufficient balance
    if (data.type === "OUT") {
        const walletBalance = Number(wallet.balance) || 0;
        if (walletBalance < data.amount) {
            throw new HTTPException(400, { message: "Insufficient balance in wallet." });
        }
    }

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
    await adjustWalletBalance(db, data.wallet_id, amountChange);

    return result;
};

export const getAllTransactions = async (
    db: DrizzleD1,
    user_id: string,
    options: { page?: number; limit?: number; wallet_id?: string; type?: "IN" | "OUT" | "TRANSFER"; search?: string; year_month?: string }
) => {
    let whereClause = and(
        eq(transactions.user_id, user_id),
        eq(transactions.is_deleted, false)
    );

    if (options.wallet_id) {
        whereClause = and(whereClause, eq(transactions.wallet_id, options.wallet_id));
    }
    if (options.type) {
        if (options.type === "TRANSFER") {
            whereClause = and(whereClause, isNotNull(transactions.linked_transaction_id));
        } else {
            whereClause = and(
                whereClause,
                eq(transactions.type, options.type),
                isNull(transactions.linked_transaction_id)
            );
        }
    }
    if (options.search) {
        whereClause = and(whereClause, like(transactions.description, `%${options.search}%`));
    }
    if (options.year_month) {
        whereClause = and(whereClause, like(transactions.transaction_date, `${options.year_month}-%`));
    }

    const result = await findManyWithIdPagination(
        db,
        transactions,
        whereClause,
        { page: options.page, limit: options.limit },
        async (currentIds) => {
            return await db
                .select({
                    id: transactions.id,
                    user_id: transactions.user_id,
                    wallet_id: transactions.wallet_id,
                    budget_id: transactions.budget_id,
                    type: transactions.type,
                    description: transactions.description,
                    amount: transactions.amount,
                    transaction_date: transactions.transaction_date,
                    is_deleted: transactions.is_deleted,
                    created_at: transactions.created_at,
                    updated_at: transactions.updated_at,
                    deleted_at: transactions.deleted_at,
                    linked_transaction_id: transactions.linked_transaction_id,
                    wallet: {
                        id: wallets.id,
                        name: wallets.name
                    },
                    budget: {
                        id: budgets.id,
                        category: budgets.category
                    },
                    linked_transaction: {
                        id: linkedTransactions.id,
                        wallet_id: linkedTransactions.wallet_id,
                        wallet_name: linkedWallets.name
                    }
                })
                .from(transactions)
                .innerJoin(wallets, eq(transactions.wallet_id, wallets.id))
                .leftJoin(budgets, eq(transactions.budget_id, budgets.id))
                .leftJoin(linkedTransactions, eq(transactions.linked_transaction_id, linkedTransactions.id))
                .leftJoin(linkedWallets, eq(linkedTransactions.wallet_id, linkedWallets.id))
                .where(inArray(transactions.id, currentIds))
        }
    );

    return result;
};

export const createTransfer = async (db: DrizzleD1, user_id: string, data: TransferInputType) => {
    if (data.source_wallet_id === data.destination_wallet_id) {
        throw new HTTPException(400, { message: "Source wallet and destination wallet must be different." });
    }

    // 1. Verify both wallets exist & belong to user in a single query
    const walletResults = await db.select()
        .from(wallets)
        .where(and(
            inArray(wallets.id, [data.source_wallet_id, data.destination_wallet_id]),
            eq(wallets.user_id, user_id),
            eq(wallets.is_deleted, false)
        ));

    const sourceWallet = walletResults.find(w => w.id === data.source_wallet_id);
    const destWallet = walletResults.find(w => w.id === data.destination_wallet_id);

    if (!sourceWallet) throw new HTTPException(404, { message: "Source wallet not found." });
    if (!destWallet) throw new HTTPException(404, { message: "Destination wallet not found." });

    // 3. Verify sufficient balance in source wallet
    const sourceBalance = Number(sourceWallet.balance) || 0;
    if (sourceBalance < data.amount) {
        throw new HTTPException(400, { message: "Insufficient balance in source wallet." });
    }

    const outTxId = crypto.randomUUID();
    const inTxId = crypto.randomUUID();

    // 4. Create source transaction (OUT)
    const outTx = await insertRecord(db, transactions, {
        id: outTxId,
        user_id,
        wallet_id: data.source_wallet_id,
        type: "OUT",
        description: "Transfer of Funds",
        amount: data.amount,
        transaction_date: data.transaction_date,
        linked_transaction_id: inTxId
    });

    // 5. Create destination transaction (IN)
    const inTx = await insertRecord(db, transactions, {
        id: inTxId,
        user_id,
        wallet_id: data.destination_wallet_id,
        type: "IN",
        description: "Transfer of Funds",
        amount: data.amount,
        transaction_date: data.transaction_date,
        linked_transaction_id: outTxId
    });

    if (!outTx || !inTx) {
        throw new HTTPException(400, { message: "Failed to create transfer transactions." });
    }

    // 6. Adjust balances on both wallets
    await adjustWalletBalance(db, data.source_wallet_id, -data.amount);
    await adjustWalletBalance(db, data.destination_wallet_id, data.amount);

    return { outTx, inTx };
};

export const updateTransaction = async (db: DrizzleD1, user_id: string, transaction_id: string, data: TransactionInputType) => {
    // 1. Fetch old transaction and verify ownership
    const txResult = await db.select()
        .from(transactions)
        .where(and(eq(transactions.id, transaction_id), eq(transactions.user_id, user_id), eq(transactions.is_deleted, false)))
        .limit(1);
    const oldTx = txResult[0];
    if (!oldTx) throw new HTTPException(404, { message: "Transaction not found." });

    if (oldTx.linked_transaction_id) {
        if (oldTx.amount !== data.amount || oldTx.wallet_id !== data.wallet_id || oldTx.type !== data.type) {
            throw new HTTPException(400, { message: "Cannot modify amount, wallet, or type of a transfer transaction. Please delete and recreate the transfer." });
        }
        if (data.budget_id !== null) {
            throw new HTTPException(400, { message: "Transfer transactions cannot be assigned to a budget category." });
        }
        // Also update description & date on the linked transaction
        await db.update(transactions)
            .set({
                description: "Transfer of Funds",
                transaction_date: data.transaction_date,
                updated_at: new Date().toISOString()
            })
            .where(and(eq(transactions.id, oldTx.linked_transaction_id), eq(transactions.user_id, user_id), eq(transactions.is_deleted, false)));
    }

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

    // 3.5. Verify sufficient balance for OUT transaction
    if (data.type === "OUT") {
        const walletBalance = Number(wallet.balance) || 0;
        if (oldTx.wallet_id === data.wallet_id) {
            const totalChange = (oldTx.type === "IN" ? -oldTx.amount : oldTx.amount) - data.amount;
            if (walletBalance + totalChange < 0) {
                throw new HTTPException(400, { message: "Insufficient balance in wallet." });
            }
        } else {
            if (walletBalance - data.amount < 0) {
                throw new HTTPException(400, { message: "Insufficient balance in new wallet." });
            }
        }
    }

    // 4. Revert old transaction balance changes
    const oldRevertAmount = oldTx.type === "IN" ? -oldTx.amount : oldTx.amount;
    // Apply new transaction balance changes
    const newAmountChange = data.type === "IN" ? data.amount : -data.amount;

    if (oldTx.wallet_id === data.wallet_id) {
        // Same wallet: total change is oldRevertAmount + newAmountChange
        const totalChange = oldRevertAmount + newAmountChange;
        if (totalChange !== 0) {
            await adjustWalletBalance(db, data.wallet_id, totalChange);
        }
    } else {
        // Different wallets: revert old wallet, apply to new wallet
        await adjustWalletBalance(db, oldTx.wallet_id, oldRevertAmount);
        await adjustWalletBalance(db, data.wallet_id, newAmountChange);
    }

    // 5. Update transaction record
    const result = await updateRecord(db, transactions, eq(transactions.id, transaction_id), {
        ...data,
        description: oldTx.linked_transaction_id ? "Transfer of Funds" : data.description
    });
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
    await adjustWalletBalance(db, oldTx.wallet_id, oldRevertAmount);

    // 3. Soft delete transaction record
    const result = await deleteRecord(db, transactions, and(eq(transactions.id, transaction_id), eq(transactions.is_deleted, false))!);
    if (!result) throw new HTTPException(400, { message: "Failed to delete transaction." });

    // 4. Delete linked transaction if this is a transfer
    if (oldTx.linked_transaction_id) {
        const linkedTxResult = await db.select()
            .from(transactions)
            .where(and(eq(transactions.id, oldTx.linked_transaction_id), eq(transactions.user_id, user_id), eq(transactions.is_deleted, false)))
            .limit(1);
        const linkedTx = linkedTxResult[0];
        if (linkedTx) {
            const linkedRevertAmount = linkedTx.type === "IN" ? -linkedTx.amount : linkedTx.amount;
            await adjustWalletBalance(db, linkedTx.wallet_id, linkedRevertAmount);
            await deleteRecord(db, transactions, eq(transactions.id, linkedTx.id));
        }
    }

    return result;
};
