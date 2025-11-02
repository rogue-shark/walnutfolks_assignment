import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { markProcessed, getTransaction } from '../db/queries.js';

const isTLS = (process.env.REDIS_URL || '').startsWith('rediss://');

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  keepAlive: 10000,
  retryStrategy: (times) => Math.min(times * 200, 2000),
  reconnectOnError: () => true,
  ...(isTLS ? { tls: { rejectUnauthorized: false } } : {})
});

type JobData = { transaction_id: string };

const processor = async (job: any) => {
  const { transaction_id } = job.data as JobData;
  const current = await getTransaction(transaction_id);
  if (!current || current.status === 'PROCESSED') return;
  await new Promise((r) => setTimeout(r, 30_000));
  await markProcessed(transaction_id);
};

const worker = new Worker<JobData>('transactions', processor, { connection });

process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));
process.on('SIGTERM', async () => { await worker.close(); process.exit(0); });
