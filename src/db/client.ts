import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function initDb() {
  // optional: verify connection at startup
  const { rows } = await pool.query('select now() as now');
  return rows[0].now as string;
}
