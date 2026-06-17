import { HTTPException } from "hono/http-exception";
import { DrizzleD1 } from "../../config/db";
import { deleteRecord, findManyWithIdPagination, insertRecord, updateRecord } from "../../lib/drizzle.d1";
import { BudgetInputType } from "./budget.schema";
import { budgets } from "./budget.table";
import { and, eq, inArray, like } from "drizzle-orm";

export const createBudget = async (db: DrizzleD1, user_id: string, data: BudgetInputType) => {
    const result = await insertRecord(db, budgets, { ...data, user_id })
    if (!result) throw new HTTPException(400, { message: "Failed create new budget." })

    return result
}

export const getAllBudgets = async (
    db: DrizzleD1,
    user_id: string,
    options: { page?: number; limit?: number; month_year?: string; }
) => {
    let whereClause = and(
        eq(budgets.user_id, user_id),
        eq(budgets.is_deleted, false)
    );

    if (options.month_year) {
        whereClause = and(whereClause, eq(budgets.month_year, options.month_year));
    }

    const result = await findManyWithIdPagination(
        db,
        budgets,
        whereClause,
        { page: options.page, limit: options.limit },
        async (currentIds) => {
            return await db
                .select()
                .from(budgets)
                .where(inArray(budgets.id, currentIds))
        }
    )

    return result
}

export const updateBudget = async (db: DrizzleD1, user_id: string, budget_id: string, data: BudgetInputType) => {
    const result = await updateRecord(
        db,
        budgets,
        and(eq(budgets.id, budget_id), eq(budgets.user_id, user_id), eq(budgets.is_deleted, false))!,
        data
    );
    if (!result) throw new HTTPException(404, { message: "Budget category not found or access denied." });

    return result;
};

export const deleteBudget = async (db: DrizzleD1, user_id: string, budget_id: string) => {
    const result = await deleteRecord(
        db,
        budgets,
        and(eq(budgets.id, budget_id), eq(budgets.user_id, user_id), eq(budgets.is_deleted, false))!
    );
    if (!result) throw new HTTPException(404, { message: "Budget category not found or access denied." });
};