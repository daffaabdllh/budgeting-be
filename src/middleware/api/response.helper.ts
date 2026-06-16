// src/middleware/api/response.helper.ts
import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type {
    PaginationMetadata,
    ValidationError,
    SuccessResponse,
    ErrorResponse,
} from "./response.types";

export interface CustomResponseHelpers {
    success: <T>(
        data: T,
        message?: string,
        statusCode?: StatusCode,
        pagination?: PaginationMetadata
    ) => Response;

    error: (message?: string, statusCode?: StatusCode) => Response;

    validationError: (
        errors: ValidationError[],
        message?: string,
        statusCode?: StatusCode
    ) => Response;
}

export function getResponseHelpers(c: Context): CustomResponseHelpers {
    return {
        success: <T>(
            data: T,
            message = "Operasi berhasil",
            statusCode = 200,
            pagination?: PaginationMetadata
        ) => {
            const body: SuccessResponse<T> = {
                status: "success",
                data,
                message,
                ...(pagination ? { pagination } : {}),
            };
            c.status(statusCode as StatusCode);
            return c.json(body);
        },

        error: (message = "Terjadi kesalahan", statusCode = 500) => {
            const body: ErrorResponse = { status: "error", message };
            c.status(statusCode as StatusCode);
            return c.json(body);
        },

        validationError: (errors: ValidationError[], message = "Validasi gagal", statusCode = 422) => {
            const body: ErrorResponse = { status: "error", message, errors };
            c.status(statusCode as StatusCode);
            return c.json(body);
        },
    };
}
