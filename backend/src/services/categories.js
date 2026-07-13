/**
 * Canonical category lists + a lightweight natural-language category guesser.
 * The guesser powers the "quick add" box on the frontend where a user can type
 * "coffee 250" and get amount + category inferred.
 */
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Other'];
export const EXPENSE_CATEGORIES = [
  'Food',
  'Groceries',
  'Transport',
  'Rent',
  'Utilities',
  'Shopping',
  'Health',
  'Entertainment',
  'Travel',
  'Education',
  'Other',
];

// keyword -> category. First match wins.
const KEYWORDS = [
  [/(coffee|lunch|dinner|restaurant|pizza|snack|cafe|zomato|swiggy)/i, 'Food'],
  [/(grocery|groceries|supermarket|vegetable|milk|bigbasket)/i, 'Groceries'],
  [/(uber|ola|cab|taxi|bus|metro|fuel|petrol|diesel|parking)/i, 'Transport'],
  [/(rent|lease)/i, 'Rent'],
  [/(electricity|water|gas|internet|wifi|phone|bill|recharge)/i, 'Utilities'],
  [/(amazon|flipkart|clothes|shoes|shopping|myntra)/i, 'Shopping'],
  [/(doctor|medicine|pharmacy|hospital|gym|health)/i, 'Health'],
  [/(movie|netflix|spotify|game|concert|entertainment)/i, 'Entertainment'],
  [/(flight|hotel|trip|travel|airbnb)/i, 'Travel'],
  [/(course|book|tuition|udemy|education|class)/i, 'Education'],
  [/(salary|payroll|paycheck)/i, 'Salary'],
  [/(freelance|invoice|client|gig)/i, 'Freelance'],
  [/(dividend|interest|investment|stock|mutual)/i, 'Investment'],
  [/(refund|reimburse|cashback)/i, 'Refund'],
  [/(gift)/i, 'Gift'],
];

export function guessCategory(text, type) {
  for (const [rx, cat] of KEYWORDS) {
    if (rx.test(text)) {
      const pool = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      // Only return a match that's valid for the requested type.
      if (pool.includes(cat)) return cat;
    }
  }
  return 'Other';
}

export function isValidCategory(type, category) {
  const pool = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return pool.includes(category);
}
