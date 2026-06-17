import { Hono } from "hono";
import { AppEnv } from "../../config/env";
import { apiMiddleware } from "../../middleware/api/api.middleware";
import { isLoggedIn } from "../../middleware/auth/auth.middleware";
import { zValidator } from "../../middleware/api/api.validationError";
import { budgetSchema } from "./budget.schema";
import { createBudget, deleteBudget, getAllBudgets, updateBudget } from "./budget.service";
import { db } from "../../config/db";

export const budgetRoutes = new Hono<AppEnv>()
    .use(apiMiddleware, isLoggedIn)
    .post("/budgets", zValidator("json", budgetSchema), async (c) => {
        const body = c.req.valid("json")
        const { id } = c.get("user")

        const result = await createBudget(db(c.env.DB), id, body)

        return c.api.success(result, "Success create new budget.", 201)
    })
    .get("/budgets", async (c) => {
        const { page, limit } = c.req.query()
        const { id } = c.get("user")

        const { data, pagination } = await getAllBudgets(db(c.env.DB), id, Number(page), Number(limit))

        return c.api.success(data, "Success get all budgets.", 200, pagination)
    })
    .put("/budgets/:id", zValidator("json", budgetSchema), async (c) => {
        const body = c.req.valid("json")
        const { id } = c.req.param()

        const result = await updateBudget(db(c.env.DB), id, body)

        return c.api.success(result, "Success update budget.", 200)
    })
    .delete("/budgets/:id", async (c) => {
        const { id } = c.req.param()

        await deleteBudget(db(c.env.DB), id)

        return c.body(null, 204)
    })