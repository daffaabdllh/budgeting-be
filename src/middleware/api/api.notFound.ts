// src/middleware/api/api.notFound.ts
import type { NotFoundHandler } from "hono";
import { getResponseHelpers } from "./response.helper";

export const apiNotFound: NotFoundHandler = (c) => {
    // Pastikan helper tersedia walaupun route tidak melewati apiMiddleware (edge-case)
    if (!c.api) c.api = getResponseHelpers(c);

    return c.api.error("Route not found", 404);
};
