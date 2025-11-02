import { Router, Request, Response } from 'express';
import { pool } from '../db/client.js';

export const health = Router();

health.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'HEALTHY', current_time: new Date().toISOString() });
});

health.get('/db/ping', async (_req: Request, res: Response) => {
  try {
    const r = await pool.query('select 1 as ok');
    res.json({ ok: r.rows[0].ok === 1, time: new Date().toISOString() });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
