/**
 * rules.js — the notification RULES ENGINE.
 *
 * One place that answers "when does a notification trigger?". Each rule is a
 * pure function of (the new transaction, the ledger before it, the ledger
 * after it) that returns a notification payload or null. The route just
 * dispatches whatever the engine returns — no trigger logic leaks into HTTP
 * handlers, so adding a rule is a one-function change and the rules are
 * self-describing (see `describeRules`, surfaced at GET /api/rules).
 *
 * Design notes:
 *  - "Transition" rules (budget/runway/balance) only fire on the transaction
 *    that CROSSES the threshold — comparing before-vs-after state — so you get
 *    one alert, not a fresh alert on every expense once you're over the line.
 *  - Rules never throw; a bad rule degrades to "no notification".
 */
import { assessAnomaly, computeRunway } from './radar.js';

// Thresholds are env-configurable so the rules are tunable without code edits.
export const RULES_CONFIG = {
  monthlyBudget: Number(process.env.MONTHLY_BUDGET || 50000),
  runwayCriticalDays: 14, // matches radar.js "critical" band
};

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const monthOf = (date) => date.slice(0, 7); // yyyy-mm
const balanceOf = (txs) => txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
const monthExpense = (txs, ym) =>
  txs.filter((t) => t.type === 'expense' && monthOf(t.date) === ym).reduce((s, t) => s + t.amount, 0);

/**
 * Evaluate every rule for a newly-created transaction.
 * @param {object} tx      the new transaction (unsaved is fine)
 * @param {Array}  before  all transactions BEFORE this one
 * @returns {{ notifications: object[], anomaly: object }}
 */
export function evaluateRules({ tx, before }) {
  const after = [...before, tx];
  const notifications = [];

  // --- Rule 1: unusual spend (statistical anomaly, expenses only) ----------
  let anomaly = { anomalous: false, score: 0, median: 0, reason: 'not-expense' };
  if (tx.type === 'expense') {
    const prior = before
      .filter((t) => t.type === 'expense' && t.category === tx.category)
      .map((t) => t.amount);
    anomaly = assessAnomaly(tx.amount, prior);
    if (anomaly.anomalous) {
      notifications.push({
        type: 'anomaly',
        title: 'Unusual spend detected',
        message: `${money(tx.amount)} on ${tx.category} is well above your usual ${money(anomaly.median)} (score ${anomaly.score}).`,
        meta: { rule: 'anomaly', category: tx.category, score: anomaly.score },
      });
    }
  }

  // --- Rule 2: monthly budget exceeded (fires only on the crossing tx) ------
  if (tx.type === 'expense') {
    const ym = monthOf(tx.date);
    const spentBefore = monthExpense(before, ym);
    const spentAfter = monthExpense(after, ym);
    const cap = RULES_CONFIG.monthlyBudget;
    if (spentBefore <= cap && spentAfter > cap) {
      notifications.push({
        type: 'budget',
        title: 'Monthly budget exceeded',
        message: `Spending for ${ym} has reached ${money(spentAfter)}, over your ${money(cap)} budget.`,
        meta: { rule: 'monthly-budget', month: ym, spent: spentAfter, budget: cap },
      });
    }
  }

  // --- Rule 3: runway just turned critical (burn-rate transition) -----------
  const runwayBefore = computeRunway(balanceOf(before), before);
  const runwayAfter = computeRunway(balanceOf(after), after);
  if (
    runwayAfter.status === 'critical' &&
    runwayBefore.status !== 'critical' &&
    runwayAfter.runwayDays != null
  ) {
    notifications.push({
      type: 'budget',
      title: 'Low runway warning',
      message: `At your current burn rate, your balance lasts only ~${runwayAfter.runwayDays} days.`,
      meta: { rule: 'runway-critical', runwayDays: runwayAfter.runwayDays },
    });
  }

  // --- Rule 4: balance went negative (expenses overtook income) -------------
  const balBefore = balanceOf(before);
  const balAfter = balanceOf(after);
  if (balBefore >= 0 && balAfter < 0) {
    notifications.push({
      type: 'budget',
      title: 'Negative balance',
      message: `Your balance is now ${money(balAfter)} — expenses have overtaken income.`,
      meta: { rule: 'negative-balance', balance: balAfter },
    });
  }

  return { notifications, anomaly };
}

/** Human-readable rule catalogue (served at GET /api/rules, and self-docs). */
export function describeRules() {
  return {
    config: RULES_CONFIG,
    rules: [
      {
        id: 'anomaly',
        name: 'Unusual spend',
        trigger: 'On an EXPENSE whose amount is a high outlier for its category (modified z-score > 3.5, needs ≥ 4 prior samples).',
      },
      {
        id: 'monthly-budget',
        name: 'Monthly budget exceeded',
        trigger: `When the calendar-month expense total first crosses ${money(RULES_CONFIG.monthlyBudget)} (configurable via MONTHLY_BUDGET).`,
      },
      {
        id: 'runway-critical',
        name: 'Low runway',
        trigger: `When the burn-rate runway first drops to ≤ ${RULES_CONFIG.runwayCriticalDays} days.`,
      },
      {
        id: 'negative-balance',
        name: 'Negative balance',
        trigger: 'When total balance first goes below zero.',
      },
    ],
  };
}
