import { z } from "zod";

export const transactionSchema = z.object({
    wallet_id: z.string().nonempty("Wallet ID is required."),
    budget_id: z.string().nullable(),
    type: z.enum(["IN", "OUT"], { message: "Type must be 'IN' or 'OUT'." }),
    description: z.string().nonempty("Description cannot be empty."),
    amount: z.number().positive("Amount must be a positive number."),
    transaction_date: z.string().nonempty("Transaction date is required.")
}).refine((data) => {
    if (data.type === "IN") {
        return data.budget_id === null;
    }
    return true;
}, {
    message: "Budget ID must be null if transaction type is IN.",
    path: ["budget_id"]
});

export type TransactionInputType = z.infer<typeof transactionSchema>;
