import { z } from "zod";

export const walletSchema = z.object({
    name: z.string().nonempty("Wallet name is required"),
    balance: z.number().nonnegative("Balance must be a non-negative number")
})

export type WalletInputType = z.infer<typeof walletSchema>;