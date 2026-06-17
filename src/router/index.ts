import { authRoutes } from "../features/auth/auth.route";
import { recurringReminderRoutes } from "../features/recurring-reminder/recurring-reminder.route";
import { walletRoutes } from "../features/wallet/wallet.route";
import { budgetRoutes } from "../features/budget/budget.route";
import { transactionRoutes } from "../features/transaction/transaction.route";

export const router = [
    {
        path: "/auth",
        handler: authRoutes
    },
    {
        path: "/",
        handler: walletRoutes
    },
    {
        path: "/",
        handler: recurringReminderRoutes
    },
    {
        path: "/",
        handler: budgetRoutes
    },
    {
        path: "/",
        handler: transactionRoutes
    }
]