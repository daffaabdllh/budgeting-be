import { z } from "zod";

export const budgetSchema = z.object({
    category: z.string().nonempty("Category cannot be empty."),
    amount: z.number().nonnegative("Amount cannot be negative."),
    month_year: z.string().nonempty("Month year cannot be empty.")
})

export type BudgetInputType = z.infer<typeof budgetSchema>;