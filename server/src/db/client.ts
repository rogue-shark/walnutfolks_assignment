import 'dotenv/config';
import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL ?? '';

export const pool = new Pool({
  connectionString: dbUrl,
  // Render/Neon/Supabase externals want TLS; keepAlive avoids idle drops
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  // sensible timeouts
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

export async function initDb() {
  const { rows } = await pool.query('select now() as now');
  return rows[0].now as string;
}
