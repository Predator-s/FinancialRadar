/**
 * validate.js — input validation for transactions. Returns { value, errors }.
 * Centralised so every write path enforces the same rules and error shapes.
 */
import { isValidCategory, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './categories.js';

const MAX_AMOUNT = 1_000_000_000; // guard against absurd/overflow values
const MAX_NOTE = 200;

export function validateTransaction(body) {
  const errors = [];
  const value = {};

  // type
  const type = String(body?.type ?? '').toLowerCase();
  if (type !== 'income' && type !== 'expense') {
    errors.push('type must be "income" or "expense"');
  } else {
    value.type = type;
  }

  // amount — must be a positive, finite number with <= 2 decimals
  const rawAmount = body?.amount;
  const amount = typeof rawAmount === 'string' ? Number(rawAmount.trim()) : rawAmount;
  if (!Number.isFinite(amount)) {
    errors.push('amount must be a number');
  } else if (amount <= 0) {
    errors.push('amount must be greater than 0');
  } else if (amount > MAX_AMOUNT) {
    errors.push(`amount must be <= ${MAX_AMOUNT}`);
  } else {
    value.amount = Math.round(amount * 100) / 100; // normalise to 2dp (money)
  }

  // category — must belong to the chosen type
  const category = String(body?.category ?? '').trim();
  if (!category) {
    errors.push('category is required');
  } else if (value.type && !isValidCategory(value.type, category)) {
    const pool = value.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    errors.push(`category "${category}" is not valid for ${value.type}. Allowed: ${pool.join(', ')}`);
  } else {
    value.category = category;
  }

  // date — optional; default today. Must be YYYY-MM-DD and not in the future.
  const today = new Date().toISOString().slice(0, 10);
  const date = String(body?.date ?? today).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('date must be YYYY-MM-DD');
  } else if (Number.isNaN(Date.parse(date))) {
    errors.push('date is not a real calendar date');
  } else if (date > today) {
    errors.push('date cannot be in the future');
  } else {
    value.date = date;
  }

  // note — optional, trimmed, length-capped
  const note = String(body?.note ?? '').trim();
  if (note.length > MAX_NOTE) {
    errors.push(`note must be <= ${MAX_NOTE} characters`);
  } else {
    value.note = note;
  }

  return { value, errors };
}
