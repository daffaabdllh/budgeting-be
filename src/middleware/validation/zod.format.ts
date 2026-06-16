// src/middleware/validation/zod.format.ts
import type { ZodError } from "zod";
import type { ValidationError } from "../api/response.types";

const toFieldPath = (path: readonly (string | number | symbol)[]) =>
    path.map((p) => (typeof p === "symbol" ? p.description ?? String(p) : String(p))).join(".");

export function formatZodError(err: ZodError): ValidationError[] {
    return err.issues.map((i) => ({
        field: toFieldPath(i.path),
        message: i.message,
    }));
}
