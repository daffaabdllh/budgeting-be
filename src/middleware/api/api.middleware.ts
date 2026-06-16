// src/middleware/api/api.middleware.ts
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import { getResponseHelpers, type CustomResponseHelpers } from "./response.helper";
import { formatZodError } from "../validation/zod.format";
import type { ValidationError } from "./response.types";

declare module "hono" {
    interface Context {
        api: CustomResponseHelpers;
    }
}

function isValidationErrors(x: unknown): x is ValidationError[] {
    return (
        Array.isArray(x) &&
        x.every((i) => i && typeof i === "object" && "field" in i && "message" in i)
    );
}

function normalizeStatus(code: unknown, fallback: number) {
    return typeof code === "number" && code >= 100 && code <= 599 ? code : fallback;
}

export const apiMiddleware: MiddlewareHandler = async (c, next) => {
    // attach helper (idempotent)
    if (!c.api) c.api = getResponseHelpers(c);
    c.set("apiReady", true);

    try {
        await next();
    } catch (err: any) {
        // HTTPException (auth, forbidden, etc)
        if (err instanceof HTTPException) {
            const status = normalizeStatus(err.status, 500);
            const cause = (err as any).cause;

            if (isValidationErrors(cause)) {
                return c.api.validationError(cause, err.message || "Validation failed", status as any);
            }

            return c.api.error(err.message || "Request failed", status as any);
        }

        // Zod error (parse yang throw)
        if (err instanceof ZodError) {
            return c.api.validationError(formatZodError(err), "Validation failed", 422);
        }

        // AWS SDK / external error with httpStatusCode
        const http = err?.$metadata?.httpStatusCode;
        if (typeof http === "number") {
            return c.api.error(err?.message || "Request failed", normalizeStatus(http, 500) as any);
        }

        // fallback
        return c.api.error(err?.message || "Internal Server Error", 500);
    }
};
