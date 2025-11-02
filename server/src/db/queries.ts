import { pool } from './client.js';

export type TxRow = {
  transaction_id: string;
  source_account: string;
  destination_account: string;
  amount: string;
  currency: string;
  status: 'PROCESSING' | 'PROCESSED';
  created_at: string;
  processed_at: string | null;
};

export async function upsertProcessing(tx: Omit<TxRow, 'status' | 'created_at' | 'processed_at'>) {
  const q = `
    INSERT INTO transactions (transaction_id, source_account, destination_account, amount, currency, status)
    VALUES ($1,$2,$3,$4,$5,'PROCESSING')
    ON CONFLICT (transaction_id) DO NOTHING
    RETURNING *;
  `;
  const vals = [tx.transaction_id, tx.source_account, tx.destination_account, tx.amount, tx.currency];
  const res = await pool.query<TxRow>(q, vals);
  return res.rows[0] ?? null; // null means it already existed
}

export async function markProcessed(transaction_id: string) {
  const q = `
    UPDATE transactions
       SET status='PROCESSED', processed_at=NOW()
     WHERE transaction_id=$1
     RETURNING *;
  `;
  const res = await pool.query<TxRow>(q, [transaction_id]);
  return res.rows[0] ?? null;
}

export async function getTransaction(transaction_id: string) {
  const q = `SELECT * FROM transactions WHERE transaction_id=$1`;
  const res = await pool.query<TxRow>(q, [transaction_id]);
  return res.rows[0] ?? null;
}
