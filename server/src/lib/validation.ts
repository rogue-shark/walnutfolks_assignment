import { z } from 'zod';

export const TransactionPayload = z.object({
  transaction_id: z.string().min(1),
  source_account: z.string().min(1),
  destination_account: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1)
});

export type TransactionPayload = z.infer<typeof TransactionPayload>;
