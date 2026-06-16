import { Hono } from "hono";
import { AppEnv } from "../../config/env";
import { apiMiddleware } from "../../middleware/api/api.middleware";
import { isLoggedIn } from "../../middleware/auth/auth.middleware";
import { zValidator } from "../../middleware/api/api.validationError";
import { walletSchema } from "./wallet.schema";
import { createWallet, deleteWallet, getAllWallets, updateWallet } from "./wallet.service";
import { db } from "../../config/db";

export const walletRoutes = new Hono<AppEnv>()
    .use(apiMiddleware)
    .use(isLoggedIn)
    .post("/wallets", zValidator("json", walletSchema), async (c) => {
        const body = c.req.valid("json")
        const { id } = c.get("user")

        const result = await createWallet(db(c.env.DB), id, body)
        return c.api.success(result, "Success create new wallet", 201);
    })
    .get("/wallets", async (c) => {
        const { id } = c.get("user")
        const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
        const limit = Math.max(1, Math.min(100, parseInt(c.req.query("limit") || "10", 10)));

        const { data, pagination } = await getAllWallets(db(c.env.DB), id, limit, page)
        return c.api.success(data, "Success get all wallets.", 200, pagination)
    })
    .put("/wallets/:id", zValidator("json", walletSchema), async (c) => {
        const body = c.req.valid("json")
        const wallet_id = c.req.param("id")

        const result = await updateWallet(db(c.env.DB), wallet_id, body)
        return c.api.success(result, "Success update wallet.", 200);
    })
    .delete("/wallets/:id", async (c) => {
        const wallet_id = c.req.param("id")

        await deleteWallet(db(c.env.DB), wallet_id)
        return c.body(null, 204)
    })