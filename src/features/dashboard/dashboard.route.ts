import { Hono } from "hono";
import { AppEnv } from "../../config/env";
import { apiMiddleware } from "../../middleware/api/api.middleware";
import { isLoggedIn } from "../../middleware/auth/auth.middleware";
import { getDashboardSummary } from "./dashboard.service";
import { db } from "../../config/db";

export const dashboardRoutes = new Hono<AppEnv>()
    .use(apiMiddleware, isLoggedIn)
    .get("/dashboard/summary", async (c) => {
        const { id } = c.get("user");
        const { month_year } = c.req.query(); // Expected format: YYYY-MM

        if (month_year && !/^\d{4}-\d{2}$/.test(month_year)) {
            return c.api.error("Invalid month_year format. Use YYYY-MM.", 400);
        }

        const result = await getDashboardSummary(db(c.env.DB), id, month_year);
        return c.api.success(result, "Success retrieve dashboard summary.", 200);
    });
