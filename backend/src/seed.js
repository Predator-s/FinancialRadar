/**
 * seed.js — populate the ledger with realistic demo data so the dashboard,
 * charts, and (crucially) the anomaly detector have history to work with.
 * Run:  npm run seed
 *
 * The last "Food" entry is a deliberate outlier (a ₹4,200 dinner among many
 * ₹150–₹400 ones) so a fresh reviewer can immediately see the Radar in action.
 */
import { store } from './store.js';
import { evaluateRules } from './services/rules.js';

store._reset();

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const seed = [
  { type: 'income', category: 'Salary', amount: 85000, date: daysAgo(28), note: 'Monthly salary' },
  { type: 'income', category: 'Freelance', amount: 12000, date: daysAgo(20), note: 'Logo project' },
  { type: 'income', category: 'Investment', amount: 3200, date: daysAgo(10), note: 'Dividend' },

  { type: 'expense', category: 'Rent', amount: 24000, date: daysAgo(27), note: 'Flat rent' },
  { type: 'expense', category: 'Utilities', amount: 2100, date: daysAgo(26), note: 'Electricity + wifi' },
  { type: 'expense', category: 'Groceries', amount: 3400, date: daysAgo(25), note: 'BigBasket' },
  { type: 'expense', category: 'Groceries', amount: 2800, date: daysAgo(12), note: 'Monthly stock-up' },

  // A tight cluster of normal Food spends → establishes the baseline.
  { type: 'expense', category: 'Food', amount: 220, date: daysAgo(24), note: 'Lunch' },
  { type: 'expense', category: 'Food', amount: 340, date: daysAgo(22), note: 'Dinner with team' },
  { type: 'expense', category: 'Food', amount: 180, date: daysAgo(19), note: 'Coffee & snack' },
  { type: 'expense', category: 'Food', amount: 400, date: daysAgo(16), note: 'Swiggy' },
  { type: 'expense', category: 'Food', amount: 260, date: daysAgo(9), note: 'Lunch' },

  { type: 'expense', category: 'Transport', amount: 650, date: daysAgo(18), note: 'Uber' },
  { type: 'expense', category: 'Entertainment', amount: 499, date: daysAgo(15), note: 'Netflix + movie' },
  { type: 'expense', category: 'Shopping', amount: 2300, date: daysAgo(8), note: 'Shoes' },
  { type: 'expense', category: 'Health', amount: 900, date: daysAgo(5), note: 'Pharmacy' },

  // 👇 The outlier — this should trip the anomaly detector.
  { type: 'expense', category: 'Food', amount: 4200, date: daysAgo(1), note: 'Birthday dinner (splurge)' },
];

// Drive the same rules engine the live API uses, so seeded notifications match
// real behaviour exactly (no hand-maintained duplicate).
let fired = 0;
for (const tx of seed) {
  const record = { ...tx, note: tx.note ?? '' };
  const before = store.listTransactions();
  const { notifications, anomaly } = evaluateRules({ tx: record, before });
  const saved = store.addTransaction({ ...record, anomaly: anomaly.anomalous });
  for (const n of notifications) {
    store.addNotification({ ...n, meta: { ...n.meta, transactionId: saved.id } });
    fired += 1;
  }
}

console.log(`Seeded ${seed.length} transactions; ${fired} notification(s) triggered by the rules engine.`);
