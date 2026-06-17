import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { db as connectDb } from "../src/config/db";
import { wallets } from "../src/features/wallet/wallet.table";
import { transactions } from "../src/features/transaction/transaction.table";
import { createTransfer, deleteTransaction, updateTransaction, getAllTransactions } from "../src/features/transaction/transaction.service";

import sql0 from "../src/database/migrations/0000_hard_outlaw_kid.sql?raw";
import sql1 from "../src/database/migrations/0001_shocking_sage.sql?raw";
import sql2 from "../src/database/migrations/0002_aspiring_molly_hayes.sql?raw";
import sql3 from "../src/database/migrations/0003_magenta_odin.sql?raw";
import sql4 from "../src/database/migrations/0004_productive_william_stryker.sql?raw";
import sql5 from "../src/database/migrations/0005_familiar_magdalene.sql?raw";
import sql6 from "../src/database/migrations/0006_lucky_black_tom.sql?raw";
import sql7 from "../src/database/migrations/0007_melted_tinkerer.sql?raw";
import sql8 from "../src/database/migrations/0008_unique_lord_hawal.sql?raw";

const applyMigrations = async (d1: D1Database) => {
    const migrations = [sql0, sql1, sql2, sql3, sql4, sql5, sql6, sql7, sql8];
    for (const sql of migrations) {
        const statements = sql.split("--> statement-breakpoint");
        for (const statement of statements) {
            const trimmed = statement.trim();
            if (trimmed) {
                const singleLineSql = trimmed.replace(/\s+/g, " ");
                await d1.exec(singleLineSql);
            }
        }
    }
};

describe("Wallet Transfer Unit Tests", () => {
    let db: any;

    beforeEach(async () => {
        await applyMigrations(env.DB);
        db = connectDb(env.DB);

        // Seed with two wallets for user1
        await db.insert(wallets).values({
            id: "w1",
            user_id: "user1",
            name: "Wallet A",
            balance: "10000",
            is_deleted: false
        });

        await db.insert(wallets).values({
            id: "w2",
            user_id: "user1",
            name: "Wallet B",
            balance: "2000",
            is_deleted: false
        });
    });

    it("should successfully transfer funds between wallets", async () => {
        const result = await createTransfer(db, "user1", {
            source_wallet_id: "w1",
            destination_wallet_id: "w2",
            amount: 3000,
            description: "Gas money",
            transaction_date: "2026-06-17"
        });

        expect(result.outTx.wallet_id).toBe("w1");
        expect(result.outTx.type).toBe("OUT");
        expect(result.outTx.amount).toBe(3000);
        expect(result.outTx.linked_transaction_id).toBe(result.inTx.id);

        expect(result.inTx.wallet_id).toBe("w2");
        expect(result.inTx.type).toBe("IN");
        expect(result.inTx.amount).toBe(3000);
        expect(result.inTx.linked_transaction_id).toBe(result.outTx.id);

        // Verify wallet balances
        const walletAResult = await db.select().from(wallets).where(eq(wallets.id, "w1")).limit(1);
        expect(Number(walletAResult[0].balance)).toBe(7000);

        const walletBResult = await db.select().from(wallets).where(eq(wallets.id, "w2")).limit(1);
        expect(Number(walletBResult[0].balance)).toBe(5000);
    });

    it("should fail transfer if source wallet balance is insufficient", async () => {
        await expect(createTransfer(db, "user1", {
            source_wallet_id: "w1",
            destination_wallet_id: "w2",
            amount: 15000, // exceeds Wallet A balance (10000)
            description: "Too expensive",
            transaction_date: "2026-06-17"
        })).rejects.toThrow("Insufficient balance in source wallet.");
    });

    it("should delete both sides of a transfer and revert balances", async () => {
        // 1. Perform a transfer
        const result = await createTransfer(db, "user1", {
            source_wallet_id: "w1",
            destination_wallet_id: "w2",
            amount: 3000,
            description: "Gas money",
            transaction_date: "2026-06-17"
        });

        // 2. Delete the OUT transaction side
        await deleteTransaction(db, "user1", result.outTx.id);

        // 3. Verify both transactions are soft-deleted (is_deleted = true)
        const deletedOut = await db.select().from(transactions).where(eq(transactions.id, result.outTx.id)).limit(1);
        expect(deletedOut[0].is_deleted).toBe(true);

        const deletedIn = await db.select().from(transactions).where(eq(transactions.id, result.inTx.id)).limit(1);
        expect(deletedIn[0].is_deleted).toBe(true);

        // 4. Verify balances are reverted
        const walletAResult = await db.select().from(wallets).where(eq(wallets.id, "w1")).limit(1);
        expect(Number(walletAResult[0].balance)).toBe(10000);

        const walletBResult = await db.select().from(wallets).where(eq(wallets.id, "w2")).limit(1);
        expect(Number(walletBResult[0].balance)).toBe(2000);
    });

    it("should block updating wallet or amount on a transfer transaction", async () => {
        const result = await createTransfer(db, "user1", {
            source_wallet_id: "w1",
            destination_wallet_id: "w2",
            amount: 3000,
            description: "Gas money",
            transaction_date: "2026-06-17"
        });

        // Attempting to change amount must reject
        await expect(updateTransaction(db, "user1", result.outTx.id, {
            wallet_id: "w1",
            budget_id: null,
            type: "OUT",
            description: "Gas money modified",
            amount: 4000, // modified
            transaction_date: "2026-06-17"
        })).rejects.toThrow("Cannot modify amount or wallet of a transfer transaction");
    });

    it("should synchronize description and date updates to both sides of a transfer", async () => {
        const result = await createTransfer(db, "user1", {
            source_wallet_id: "w1",
            destination_wallet_id: "w2",
            amount: 3000,
            description: "Gas money",
            transaction_date: "2026-06-17"
        });

        // Update description and date on outTx
        await updateTransaction(db, "user1", result.outTx.id, {
            wallet_id: "w1",
            budget_id: null,
            type: "OUT",
            description: "Uber ride",
            amount: 3000,
            transaction_date: "2026-06-18"
        });

        // Verify the IN transaction is updated as well
        const inTxResult = await db.select().from(transactions).where(eq(transactions.id, result.inTx.id)).limit(1);
        expect(inTxResult[0].description).toBe("Uber ride");
        expect(inTxResult[0].transaction_date).toBe("2026-06-18");
    });

    it("should return transactions with joined wallet, budget, and linked_transaction objects", async () => {
        const transfer = await createTransfer(db, "user1", {
            source_wallet_id: "w1",
            destination_wallet_id: "w2",
            amount: 3000,
            description: "Gas money",
            transaction_date: "2026-06-17"
        });

        const { data } = await getAllTransactions(db, "user1", {});
        expect(data).toHaveLength(2);

        const outTx = data.find((t: any) => t.type === "OUT");
        expect(outTx).toBeDefined();
        expect(outTx.wallet).toEqual({ id: "w1", name: "Wallet A" });
        expect(outTx.budget).toBeNull();
        expect(outTx.linked_transaction).toEqual({
            id: transfer.inTx.id,
            wallet_id: "w2",
            wallet_name: "Wallet B"
        });

        const inTx = data.find((t: any) => t.type === "IN");
        expect(inTx).toBeDefined();
        expect(inTx.wallet).toEqual({ id: "w2", name: "Wallet B" });
        expect(inTx.linked_transaction).toEqual({
            id: transfer.outTx.id,
            wallet_id: "w1",
            wallet_name: "Wallet A"
        });
    });
});

// Helper to assert equality in tests since eq is imported from drizzle-orm
import { eq } from "drizzle-orm";
