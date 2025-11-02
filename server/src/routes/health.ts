import { Router, Request, Response } from 'express';

export const health = Router();

health.get('/', (req: Request, res: Response) => {
  res.json({ status: 'HEALTHY', current_time: new Date().toISOString() });
});
