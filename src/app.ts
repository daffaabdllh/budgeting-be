import { Hono } from "hono";
import { AppEnv, Bindings } from "./config/env";
import { apiMiddleware } from "./middleware/api/api.middleware";
import { apiOnError } from "./middleware/api/api.onError";
import { apiNotFound } from "./middleware/api/api.notFound";
import { router } from "./router";

const app = new Hono<AppEnv>()
	.use(apiMiddleware)
	.onError(apiOnError)
	.notFound(apiNotFound)

router.forEach((route) => app.route(route.path, route.handler));

export default {
	async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
		const dynamicApp = new Hono<AppEnv>().basePath(env.BASE_PATH).onError(apiOnError);

		dynamicApp.route("/", app);

		return dynamicApp.fetch(request, env, ctx);
	},
};