import { Router } from 'express';
import { store } from '../store.js';
import { notify, activeChannels } from '../services/notifier.js';
import { buildSummary } from '../services/summary.js';

const router = Router();

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

router.get('/notifications', (_req, res) => {
  const items = store.listNotifications();
  res.json({ items, unread: items.filter((n) => !n.read).length, channels: activeChannels() });
});

router.post('/notifications/:id/read', (req, res) => {
  const n = store.markNotificationRead(req.params.id);
  if (!n) return res.status(404).json({ errors: ['notification not found'] });
  res.json(n);
});

router.post('/notifications/read-all', (_req, res) => {
  const count = store.markAllNotificationsRead();
  res.json({ updated: count });
});

// Manual "send a notification" endpoint — satisfies the "internal feature to
// send notifications via any medium" requirement directly, and doubles as a
// runway digest: if the balance is on a critical burn-rate, it says so.
router.post('/notify', async (req, res) => {
  const { title, message, type } = req.body ?? {};
  if (!title || !message) return res.status(400).json({ errors: ['title and message are required'] });
  const record = await notify({ type: type || 'info', title, message });
  res.status(201).json(record);
});

router.post('/notify/digest', async (_req, res) => {
  const s = buildSummary(store.listTransactions());
  const runwayLine =
    s.runway.runwayDays == null
      ? `You're cash-flow positive (${money(s.runway.dailyNet)}/day). Nice.`
      : `At ${money(-s.runway.dailyNet)}/day burn, your balance lasts ~${s.runway.runwayDays} days (${s.runway.status}).`;
  const record = await notify({
    type: 'digest',
    title: 'Your ledger digest',
    message: `Balance ${money(s.totals.balance)} · saved ${s.totals.savingsRate}% · ${runwayLine}`,
    meta: { runway: s.runway, totals: s.totals },
  });
  res.status(201).json(record);
});

export default router;
