import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { getResponseHelpers } from "./response.helper";
import { formatZodError } from "../validation/zod.format";

/**
 * Converts database snake_case column names into human-friendly names
 */
function formatColumnName(col: string): string {
    const mappings: Record<string, string> = {
        email: "Email",
        username: "Username",
        phone: "Phone Number",
        mobile: "Mobile Number",
        address: "Address",
        code: "Code",
        name: "Name",
        role: "Role",
        price: "Price",
        stock: "Stock",
        sku: "SKU / Item Code",
        barcode: "Barcode",
        rate: "Rate",
        percentage: "Percentage",
        amount: "Amount",
        category_id: "Category ID",
        outlet_id: "Outlet ID",
        product_id: "Product ID",
        tax_name: "Tax Name",
        tax_value: "Tax Value",
        category_name: "Category Name",
        sub_category_name: "Sub-Category Name",
    };

    if (mappings[col.toLowerCase()]) {
        return mappings[col.toLowerCase()];
    }

    // Convert snake_case to separated words
    let friendly = col.replace(/_/g, " ");

    if (friendly.toLowerCase().endsWith(" id")) {
        friendly = friendly.substring(0, friendly.length - 3) + " ID";
    }

    // Capitalize each word
    return friendly
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
        .trim();
}

/**
 * Translates SQLite / D1 database errors into user-friendly general error messages
 */
function parseSQLiteError(errorMessage: string): string {
    // 1. UNIQUE constraint failed (Duplicate Data)
    if (errorMessage.includes("UNIQUE constraint failed:")) {
        const match = errorMessage.match(/UNIQUE constraint failed:\s*([^:]+)/);
        if (match) {
            const columnsRaw = match[1].trim();

            // Get column name only & clean it
            const columns = columnsRaw.split(",")
                .map((col) => {
                    const parts = col.trim().split(".");
                    return parts[parts.length - 1]; // e.g. "sub_category_name"
                })
                // Ignore system/internal columns to avoid confusing the user
                .filter((col) => {
                    const systemCols = ["tenant_id", "tenantid", "is_deleted", "isdeleted", "deleted_at", "deletedat", "id"];
                    return !systemCols.includes(col.toLowerCase());
                });

            if (columns.length === 0) {
                return "Failed to save because a unique record is already exists.";
            }

            // Convert all columns to friendly names
            const friendlyColumns = columns.map(formatColumnName);

            // Join with "and"
            return `Failed to save because the ${friendlyColumns.join(" and ")} is already exists.`;
        }
        return "Failed to save due to a unique constraint conflict (duplicate data).";
    }

    // 2. FOREIGN KEY constraint failed (Invalid Reference)
    if (errorMessage.includes("FOREIGN KEY constraint failed")) {
        return "Failed to process data because the referenced data (relation) is invalid or could not be found.";
    }

    // 3. NOT NULL constraint failed (Required Field Empty)
    if (errorMessage.includes("NOT NULL constraint failed:")) {
        const match = errorMessage.match(/NOT NULL constraint failed:\s*([^\s:]+)/);
        if (match) {
            const columnRaw = match[1].trim();
            const parts = columnRaw.split(".");
            const col = parts[parts.length - 1];

            return `Column ${formatColumnName(col)} cannot be empty.`;
        }
        return "A required column is empty.";
    }

    // 4. CHECK constraint failed (Data Validation Rule)
    if (errorMessage.includes("CHECK constraint failed")) {
        return "Failed to process because the data violates database validation constraint rules.";
    }

    // Fallback if no specific constraint is matched
    return errorMessage;
}

export const apiOnError: ErrorHandler = (err, c) => {
    if (!c.api) c.api = getResponseHelpers(c);

    // HTTPException (auth, forbidden, etc)
    if (err instanceof HTTPException) {
        const status = err.status >= 100 && err.status <= 599 ? err.status : 500;
        const cause = (err as any).cause;

        if (cause && Array.isArray(cause)) {
            return c.api.validationError(cause, err.message || "Validation failed", status as any);
        }

        return c.api.error(err.message || "Request failed", status as any);
    }

    // Zod Validation Error
    if (err instanceof ZodError) {
        return c.api.validationError(formatZodError(err), "Validation failed", 422);
    }

    // D1 / SQLite / Drizzle Database Constraint Error
    let dbErrorMessage = "";
    const errCause = err.cause as any;

    if (err.message && (err.message.includes("D1_ERROR") || err.message.includes("SQLITE_CONSTRAINT") || err.message.includes("UNIQUE constraint failed") || err.message.includes("FOREIGN KEY constraint failed") || err.message.includes("NOT NULL constraint failed"))) {
        dbErrorMessage = err.message;
    } else if (errCause && typeof errCause.message === "string" && (errCause.message.includes("D1_ERROR") || errCause.message.includes("SQLITE_CONSTRAINT") || errCause.message.includes("UNIQUE constraint failed") || errCause.message.includes("FOREIGN KEY constraint failed") || errCause.message.includes("NOT NULL constraint failed"))) {
        dbErrorMessage = errCause.message;
    } else if (err.message && err.message.startsWith("Failed query:") && errCause) {
        dbErrorMessage = typeof errCause === "string" ? errCause : (errCause.message || String(errCause));
    }

    if (dbErrorMessage) {
        const friendlyMessage = parseSQLiteError(dbErrorMessage);
        return c.api.error(friendlyMessage, 409); // Return HTTP 409 Conflict
    }

    // General fallback error
    return c.api.error(err.message || "Internal Server Error", 500);
};
