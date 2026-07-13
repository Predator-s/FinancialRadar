import express from 'express';
import cors from 'cors';
import transactionsRouter from './routes/transactions.js';
import notificationsRouter from './routes/notifications.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple request log — handy when watching the anomaly notifications fire.
app.use((req, _res, next) => {
  if (req.method !== 'GET') console.log(`→ ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bytex-ledger', ts: new Date().toISOString() }));

app.use('/api', transactionsRouter);
app.use('/api', notificationsRouter);

// 404 for unknown API routes.
app.use('/api', (_req, res) => res.status(404).json({ errors: ['not found'] }));

// Central error handler — malformed JSON body etc. land here as clean 400s.
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ errors: ['invalid JSON body'] });
  console.error('[error]', err);
  res.status(500).json({ errors: ['internal server error'] });
});

app.listen(PORT, () => {
  console.log(`\nBytex Ledger API listening on http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health\n`);
});
