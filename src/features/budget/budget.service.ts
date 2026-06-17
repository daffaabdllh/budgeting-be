import { HTTPException } from "hono/http-exception";
import { DrizzleD1 } from "../../config/db";
import { deleteRecord, findManyWithIdPagination, insertRecord, updateRecord } from "../../lib/drizzle.d1";
import { BudgetInputType } from "./budget.schema";
import { budgets } from "./budget.table";
import { and, eq, inArray } from "drizzle-orm";

export const createBudget = async (db: DrizzleD1, user_id: string, data: BudgetInputType) => {
    const result = await insertRecord(db, budgets, { ...data, user_id })
    if (!result) throw new HTTPException(400, { message: "Failed create new budget." })

    return result
}

export const getAllBudgets = async (db: DrizzleD1, user_id: string, page?: number, limit?: number) => {
    const result = await findManyWithIdPagination(
        db,
        budgets,
        and(eq(budgets.user_id, user_id), eq(budgets.is_deleted, false)),
        { page, limit },
        async (currentIds) => {
            return await db
                .select()
                .from(budgets)
                .where(inArray(budgets.id, currentIds))
        }
    )

    return result
}

export const updateBudget = async (db: DrizzleD1, budget_id: string, data: BudgetInputType) => {
    const result = await updateRecord(db, budgets, eq(budgets.id, budget_id), data)
    if (!result) throw new HTTPException(400, { message: "Failed update budget." })

    return result
}

export const deleteBudget = async (db: DrizzleD1, budget_id: string) => {
    const result = await deleteRecord(db, budgets, and(eq(budgets.id, budget_id), eq(budgets.is_deleted, false))!)
    if (!result) throw new HTTPException(400, { message: "Failed delete budget." })
}