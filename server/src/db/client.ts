import 'dotenv/config';
import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL ?? '';

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },     // external endpoints expect TLS
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on('error', (err) => {
  console.error('[pg pool error]', err);
});

export async function initDb() {
  const { rows } = await pool.query('select now() as now');
  return rows[0].now as string;
}
