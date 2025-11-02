import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const isTLS = (process.env.REDIS_URL || '').startsWith('rediss://');

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,        // required for BullMQ
  enableReadyCheck: true,
  keepAlive: 10000,
  retryStrategy: (times) => Math.min(times * 200, 2000),
  reconnectOnError: () => true,
  ...(isTLS ? { tls: { rejectUnauthorized: false } } : {})
});

export const txQueue = new Queue('transactions', { connection });
