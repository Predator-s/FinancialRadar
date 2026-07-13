// Thin API client. Centralises fetch + error handling so components stay clean.
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errors?.join(', ') || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  getCategories: () => request('/categories'),
  getTransactions: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request('/transactions' + (qs ? `?${qs}` : ''));
  },
  getSummary: () => request('/summary'),
  addTransaction: (tx) => request('/transactions', { method: 'POST', body: JSON.stringify(tx) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  parse: (text, type) => request('/parse', { method: 'POST', body: JSON.stringify({ text, type }) }),
  getNotifications: () => request('/notifications'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
  sendDigest: () => request('/notify/digest', { method: 'POST' }),
};
