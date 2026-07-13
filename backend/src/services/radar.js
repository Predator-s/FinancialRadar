/**
 * radar.js — the "Financial Radar" (this project's unique twist).
 *
 * Two things a boilerplate ledger wouldn't ship:
 *
 *  1) ANOMALY DETECTION — when an expense is logged, we compare it against the
 *     history of that same category using a robust z-score. Unusually large
 *     spends are flagged and a notification fires automatically. We use the
 *     MEDIAN + MAD (median absolute deviation) instead of mean/std because a
 *     single huge outlier poisons mean/std and would then hide the *next*
 *     outlier. MAD is resistant to that. Classic real-world stats edge case.
 *
 *  2) BURN-RATE RUNWAY — from the trailing-window net cash flow we project how
 *     many days the current balance will last. Handles the "you're actually
 *     saving" case (infinite runway) without dividing by zero.
 */

const MIN_HISTORY = 4;         // need enough samples before crying wolf
const Z_THRESHOLD = 3.5;       // modified z-score cutoff (Iglewicz-Hoaglin)
const MAD_SCALE = 0.6745;      // constant that makes MAD ~ std for normal data

function median(nums) {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Decide whether `amount` is anomalous for its category given prior amounts.
 * Returns { anomalous, score, median, reason } — never throws.
 */
export function assessAnomaly(amount, priorAmountsInCategory) {
  const history = priorAmountsInCategory.filter((n) => Number.isFinite(n) && n > 0);
  if (history.length < MIN_HISTORY) {
    return { anomalous: false, score: 0, median: median(history), reason: 'insufficient-history' };
  }

  const med = median(history);
  const absDevs = history.map((n) => Math.abs(n - med));
  const mad = median(absDevs);

  // If MAD is 0 (all historical values identical), fall back to a simple
  // ratio test so we still catch a spend that's wildly different.
  if (mad === 0) {
    const anomalous = med > 0 && amount > med * 3;
    return {
      anomalous,
      score: anomalous ? Infinity : 0,
      median: med,
      reason: anomalous ? 'flat-history-3x-spike' : 'within-flat-history',
    };
  }

  const modifiedZ = (MAD_SCALE * (amount - med)) / mad;
  // Only flag spends that are unusually *high* (over-spend), not unusually low.
  const anomalous = modifiedZ > Z_THRESHOLD;
  return {
    anomalous,
    score: Number(modifiedZ.toFixed(2)),
    median: med,
    reason: anomalous ? 'high-outlier' : 'normal',
  };
}

/**
 * Project runway (days the current balance lasts) from trailing net flow.
 * @param {number} balance      current net balance (income - expense)
 * @param {Array}  transactions all transactions
 * @param {number} windowDays   trailing window to estimate daily burn
 */
export function computeRunway(balance, transactions, windowDays = 30, today = new Date()) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.date >= cutoffStr) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
  }

  const netPerDay = (income - expense) / windowDays;

  if (netPerDay >= 0) {
    // Cash-flow positive: not burning down the balance.
    return { dailyNet: Number(netPerDay.toFixed(2)), runwayDays: null, status: 'sustainable' };
  }

  const burnPerDay = -netPerDay;
  const runwayDays = balance <= 0 ? 0 : Math.floor(balance / burnPerDay);
  return {
    dailyNet: Number(netPerDay.toFixed(2)),
    runwayDays,
    status: runwayDays <= 14 ? 'critical' : runwayDays <= 45 ? 'warning' : 'ok',
  };
}
