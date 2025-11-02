import 'dotenv/config';
import { Pool } from 'pg';

const needsSSL =
  process.env.DATABASE_URL &&
  /render\.com|neon\.tech|supabase\.co|aws/.test(process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined
});

export async function initDb() {
  const { rows } = await pool.query('select now() as now');
  return rows[0].now as string;
}
