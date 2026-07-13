import { Router } from 'express';
import { store } from '../store.js';
import { validateTransaction } from '../services/validate.js';
import { buildSummary } from '../services/summary.js';
import { evaluateRules, describeRules } from '../services/rules.js';
import { notify } from '../services/notifier.js';
import { guessCategory, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../services/categories.js';

const router = Router();

// Category metadata for the frontend dropdowns.
router.get('/categories', (_req, res) => {
  res.json({ income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES });
});

// The notification rule catalogue — self-documenting "when does it trigger?".
router.get('/rules', (_req, res) => {
  res.json(describeRules());
});

// List transactions (optional filters: type, category, from, to).
router.get('/transactions', (req, res) => {
  const { type, category, from, to } = req.query;
  let rows = store.listTransactions();
  if (type) rows = rows.filter((t) => t.type === type);
  if (category) rows = rows.filter((t) => t.category === category);
  if (from) rows = rows.filter((t) => t.date >= from);
  if (to) rows = rows.filter((t) => t.date <= to);
  res.json(rows);
});

// Dashboard summary + Financial Radar.
router.get('/summary', (_req, res) => {
  res.json(buildSummary(store.listTransactions()));
});

// Create a transaction. Runs the notification rules engine and dispatches every
// alert it triggers — the moment where the "twist" earns its keep.
router.post('/transactions', async (req, res) => {
  const { value, errors } = validateTransaction(req.body);
  if (errors.length) return res.status(400).json({ errors });

  // Evaluate rules against the ledger state before vs after this transaction.
  const before = store.listTransactions();
  const { notifications, anomaly } = evaluateRules({ tx: { ...value }, before });

  const tx = store.addTransaction({ ...value, anomaly: anomaly.anomalous });

  // Dispatch every triggered notification. Awaited so the client learns which
  // rules fired, but channel failures inside notify() can't fail the write.
  await Promise.all(
    notifications.map((n) => notify({ ...n, meta: { ...n.meta, transactionId: tx.id } }))
  );

  res.status(201).json({
    transaction: tx,
    radar: anomaly,
    triggered: notifications.map((n) => n.meta.rule),
  });
});

// Natural-language quick-add: parse "coffee 250" → { amount, category, note }.
// Does NOT persist — returns a parsed draft for the user to confirm.
router.post('/parse', (req, res) => {
  const text = String(req.body?.text ?? '').trim();
  const type = req.body?.type === 'income' ? 'income' : 'expense';
  if (!text) return res.status(400).json({ errors: ['text is required'] });

  // First number (supports 1,234.50 and 1234) is the amount.
  const amountMatch = text.match(/(\d[\d,]*\.?\d*)/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : null;
  const note = text.replace(/(\d[\d,]*\.?\d*)/, '').trim();
  const category = guessCategory(text, type);

  res.json({ draft: { type, amount, category, note, date: new Date().toISOString().slice(0, 10) } });
});

// Delete.
router.delete('/transactions/:id', (req, res) => {
  const ok = store.deleteTransaction(req.params.id);
  if (!ok) return res.status(404).json({ errors: ['transaction not found'] });
  res.status(204).end();
});

export default router;
