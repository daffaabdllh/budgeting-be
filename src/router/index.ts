import { authRoutes } from "../features/auth/auth.route";
import { walletRoutes } from "../features/wallet/wallet.route";

export const router = [
    {
        path: "/auth",
        handler: authRoutes
    },
    {
        path: "/",
        handler: walletRoutes
    }
]