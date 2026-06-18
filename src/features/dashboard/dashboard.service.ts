import { DrizzleD1 } from "../../config/db";
import { wallets } from "../wallet/wallet.table";
import { transactions } from "../transaction/transaction.table";
import { budgets } from "../budget/budget.table";
import { recurringReminders } from "../recurring-reminder/recurring-reminder.table";
import { and, eq, gte, like, lte } from "drizzle-orm";
import { users } from "../user/user.table";
import { getCycleDateRange } from "../../lib/date";

export const getDashboardSummary = async (db: DrizzleD1, user_id: string, month_year?: string) => {
    // 1. Determine target YYYY-MM (defaults to current month in UTC)
    const targetMonthYear = month_year || new Date().toISOString().substring(0, 7);

    // 1.5. Fetch user's salary_day to compute range
    const userResult = await db
        .select({ salary_day: users.salary_day })
        .from(users)
        .where(eq(users.id, user_id))
        .limit(1);
    const salaryDay = userResult[0]?.salary_day ?? 1;

    const { startDate, endDate } = getCycleDateRange(targetMonthYear, salaryDay);

    // 2. Fetch all required data in parallel to minimize roundtrips
    const [activeWallets, monthlyTx, activeBudgets, activeReminders] = await Promise.all([
        db.select()
            .from(wallets)
            .where(and(eq(wallets.user_id, user_id), eq(wallets.is_deleted, false))),
        db.select()
            .from(transactions)
            .where(and(
                eq(transactions.user_id, user_id),
                eq(transactions.is_deleted, false),
                gte(transactions.transaction_date, startDate),
                lte(transactions.transaction_date, endDate)
            )),
        db.select()
            .from(budgets)
            .where(and(
                eq(budgets.user_id, user_id),
                eq(budgets.month_year, targetMonthYear),
                eq(budgets.is_deleted, false)
            )),
        db.select()
            .from(recurringReminders)
            .where(and(
                eq(recurringReminders.user_id, user_id),
                eq(recurringReminders.is_active, true),
                eq(recurringReminders.is_deleted, false)
            ))
    ]);

    const totalNetWorth = activeWallets.reduce((acc, w) => acc + (Number(w.balance) || 0), 0);

    let income = 0;
    let expense = 0;
    monthlyTx.forEach((tx) => {
        if (tx.type === "IN") {
            income += tx.amount;
        } else if (tx.type === "OUT") {
            expense += tx.amount;
        }
    });
    const savings = income - expense;

    const spentMap: Record<string, number> = {};
    monthlyTx.forEach((tx) => {
        if (tx.type === "OUT" && tx.budget_id) {
            spentMap[tx.budget_id] = (spentMap[tx.budget_id] || 0) + tx.amount;
        }
    });

    const budgetSummary = activeBudgets.map((b) => {
        const spent = spentMap[b.id] || 0;
        const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        return {
            id: b.id,
            category: b.category,
            budget: b.amount,
            spent,
            percentage
        };
    });

    // 5. Compute Expense by Wallet
    const walletMap: Record<string, string> = {};
    activeWallets.forEach((w) => {
        walletMap[w.id] = w.name;
    });

    const walletSpentMap: Record<string, number> = {};
    monthlyTx.forEach((tx) => {
        if (tx.type === "OUT") {
            walletSpentMap[tx.wallet_id] = (walletSpentMap[tx.wallet_id] || 0) + tx.amount;
        }
    });

    const expenseByWallet = Object.entries(walletSpentMap).map(([walletId, spent]) => {
        return {
            wallet_id: walletId,
            wallet_name: walletMap[walletId] || "Unknown Wallet",
            spent
        };
    });

    const upcomingReminders = activeReminders.map((r) => {
        const dueDate = `${targetMonthYear}-${String(r.day_of_month).padStart(2, "0")}`;
        return {
            id: r.id,
            description: r.description,
            amount: r.amount,
            day_of_month: r.day_of_month,
            due_date: dueDate
        };
    });

    const totalAllocated = activeBudgets.reduce((acc, b) => acc + b.amount, 0);

    return {
        month_year: targetMonthYear,
        total_net_worth: totalNetWorth,
        monthly_cashflow: {
            income,
            expense,
            savings,
            unallocated_amount: income - totalAllocated
        },
        budget_summary: budgetSummary,
        expense_by_wallet: expenseByWallet,
        upcoming_reminders: upcomingReminders
    };
};
