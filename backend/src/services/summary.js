/**
 * summary.js — aggregations for the dashboard: totals, per-category breakdown,
 * and a daily net-flow series for the trend sparkline.
 */
import { computeRunway } from './radar.js';

export function buildSummary(transactions, { windowDays = 30 } = {}) {
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = {}; // category -> { income, expense }
  const byDay = {};      // yyyy-mm-dd -> net

  for (const t of transactions) {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;

    byCategory[t.category] ??= { income: 0, expense: 0 };
    byCategory[t.category][t.type] += t.amount;

    byDay[t.date] ??= 0;
    byDay[t.date] += t.type === 'income' ? t.amount : -t.amount;
  }

  const balance = totalIncome - totalExpense;

  const expenseByCategory = Object.entries(byCategory)
    .filter(([, v]) => v.expense > 0)
    .map(([category, v]) => ({ category, amount: Number(v.expense.toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount);

  // Build a continuous daily series (fill gaps with 0) for the trend chart,
  // then convert to a running cumulative balance — far more useful than raw
  // daily bars for spotting where money actually went.
  const dailyNet = Object.entries(byDay)
    .map(([date, net]) => ({ date, net: Number(net.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  const balanceTrend = dailyNet.map((d) => {
    running += d.net;
    return { date: d.date, balance: Number(running.toFixed(2)), net: d.net };
  });

  const runway = computeRunway(balance, transactions, windowDays);

  return {
    totals: {
      income: Number(totalIncome.toFixed(2)),
      expense: Number(totalExpense.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      savingsRate:
        totalIncome > 0 ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)) : 0,
    },
    count: transactions.length,
    expenseByCategory,
    balanceTrend,
    runway,
  };
}
