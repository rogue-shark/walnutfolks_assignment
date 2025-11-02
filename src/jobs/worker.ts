import 'dotenv/config';
import { Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { markProcessed, getTransaction } from '../db/queries.js';

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null
});

// Each job name is the transaction_id
type JobData = { transaction_id: string };

const processor = async (job: any) => {
  const { transaction_id } = job.data as JobData;

  // If already processed (e.g., duplicate job), no-op
  const current = await getTransaction(transaction_id);
  if (!current) {
    // Record should exist; if not, skip gracefully
    return;
  }
  if (current.status === 'PROCESSED') return;

  // Simulate 30s external work
  await new Promise(res => setTimeout(res, 30_000));

  await markProcessed(transaction_id);
};

const worker = new Worker<JobData>('transactions', processor, { connection });

worker.on('ready', () => console.log('Worker ready'));
worker.on('completed', job => console.log(`Processed ${job.id}`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed`, err));
