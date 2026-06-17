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

export const transferSchema = z.object({
    source_wallet_id: z.string().nonempty("Source wallet ID is required."),
    destination_wallet_id: z.string().nonempty("Destination wallet ID is required."),
    amount: z.number().positive("Amount must be a positive number."),
    transaction_date: z.string().nonempty("Transaction date is required.")
}).refine((data) => data.source_wallet_id !== data.destination_wallet_id, {
    message: "Source wallet and destination wallet must be different.",
    path: ["destination_wallet_id"]
});

export type TransferInputType = z.infer<typeof transferSchema>;
