import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/client.js';
import { health } from './routes/health.js';
import { transactions } from './routes/transactions.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/', health);
app.use('/v1', transactions);

const PORT = Number(process.env.PORT || 8080);

initDb()
  .then(now => console.log('DB connected, time:', now))
  .catch(err => console.error('DB connect error:', err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`API on http://localhost:${PORT}`);
    });
  });
