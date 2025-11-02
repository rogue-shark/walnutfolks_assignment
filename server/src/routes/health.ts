import { Router } from 'express';

export const health = Router();

health.get('/', (req, res) => {
  res.json({
    status: 'HEALTHY',
    current_time: new Date().toISOString()
  });
});
