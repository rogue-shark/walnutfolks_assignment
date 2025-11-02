import { Router } from 'express';
import { TransactionPayload, TransactionPayload as TP } from '../lib/validation.js';
import { upsertProcessing, getTransaction } from '../db/queries.js';
import { txQueue } from '../jobs/queue.js';

export const transactions = Router();

/**
 * POST /v1/webhooks/transactions
 * - validate payload
 * - upsert PROCESSING
 * - enqueue background job (jobId = transaction_id)
 * - return 202 quickly
 */
transactions.post('/webhooks/transactions', async (req, res) => {
  try {
    const parsed = TransactionPayload.parse(req.body);

    await upsertProcessing({
      transaction_id: parsed.transaction_id,
      source_account: parsed.source_account,
      destination_account: parsed.destination_account,
      amount: String(parsed.amount),
      currency: parsed.currency
    });

    // Dedup by jobId (if already queued, BullMQ will not enqueue another)
    await txQueue.add(parsed.transaction_id, { transaction_id: parsed.transaction_id }, { jobId: parsed.transaction_id });

    // 202 within 500ms, no need to wait for anything else
    res.status(202).json({ acknowledged: true });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid payload', details: e.flatten() });
    }
    // For robustness, still acknowledge as accepted unless it's a hard failure
    console.error('Webhook error:', e);
    res.status(202).json({ acknowledged: true });
  }
});

/**
 * GET /v1/transactions/:transaction_id
 * - returns current state
 */
transactions.get('/transactions/:transaction_id', async (req, res) => {
  const id = req.params.transaction_id;
  const row = await getTransaction(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});
