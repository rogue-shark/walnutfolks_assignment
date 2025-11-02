import { Router, Request, Response } from 'express';
import { TransactionPayload } from '../lib/validation.js';
import { upsertProcessing, getTransaction } from '../db/queries.js';
import { txQueue } from '../jobs/queue.js';

export const transactions = Router();

transactions.post('/webhooks/transactions', async (req: Request, res: Response) => {
  try {
    const parsed = TransactionPayload.parse(req.body);

    await upsertProcessing({
      transaction_id: parsed.transaction_id,
      source_account: parsed.source_account,
      destination_account: parsed.destination_account,
      amount: String(parsed.amount),
      currency: parsed.currency
    });

    await txQueue.add(parsed.transaction_id, { transaction_id: parsed.transaction_id }, { jobId: parsed.transaction_id });

    res.status(202).json({ acknowledged: true });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid payload', details: e.flatten() });
    }
    console.error('Webhook error:', e);
    res.status(202).json({ acknowledged: true });
  }
});

transactions.get('/transactions/:transaction_id', async (req: Request, res: Response) => {
  const id = req.params.transaction_id;
  const row = await getTransaction(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});
