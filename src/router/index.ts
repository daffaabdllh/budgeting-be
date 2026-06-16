import { authRoutes } from "../features/auth/auth.route";

export const router = [
    {
        path: "/auth",
        handler: authRoutes
    }
]