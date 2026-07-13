import React, { useCallback, useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { api } from './api.js';
import SummaryCards from './components/SummaryCards.jsx';
import RadarPanel from './components/RadarPanel.jsx';
import AddTransaction from './components/AddTransaction.jsx';
import TransactionList from './components/TransactionList.jsx';
import { CategoryChart, BalanceTrendChart } from './components/Charts.jsx';
import NotificationBell from './components/NotificationBell.jsx';

export default function App() {
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [notifs, setNotifs] = useState({ items: [], unread: 0, channels: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [sending, setSending] = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [txs, sum, nt] = await Promise.all([
        api.getTransactions(),
        api.getSummary(),
        api.getNotifications(),
      ]);
      setTransactions(txs);
      setSummary(sum);
      setNotifs(nt);
      setError('');
    } catch (err) {
      setError('Could not reach the API. Is the backend running on :4000?');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setCategories(await api.getCategories());
        await refresh();
      } catch {
        setError('Could not reach the API. Is the backend running on :4000?');
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  async function handleDelete(id) {
    await api.deleteTransaction(id);
    showToast('Transaction deleted');
    refresh();
  }

  async function handleDigest() {
    setSending(true);
    try {
      await api.sendDigest();
      await api.getNotifications().then(setNotifs);
      showToast('📊 Digest notification sent');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSending(false);
    }
  }

  async function markRead(id) {
    await api.markRead(id);
    api.getNotifications().then(setNotifs);
  }
  async function markAllRead() {
    await api.markAllRead();
    api.getNotifications().then(setNotifs);
  }

  if (loading) return <div className="loading">Loading your ledger…</div>;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo"><Wallet size={22} strokeWidth={2.2} /></div>
          <div>
            <h1>Bytex Ledger</h1>
            <p>Smart mini-ledger with a Financial Radar</p>
          </div>
        </div>
        <NotificationBell
          data={notifs}
          onOpen={() => api.getNotifications().then(setNotifs)}
          onRead={markRead}
          onReadAll={markAllRead}
        />
      </header>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      {summary && <SummaryCards totals={summary.totals} count={summary.count} />}

      <div className="grid main-grid">
        <div className="grid" style={{ gap: 16 }}>
          {summary && <BalanceTrendChart data={summary.balanceTrend} />}
          <TransactionList transactions={transactions} categories={categories} onDelete={handleDelete} />
        </div>
        <div className="grid" style={{ gap: 16 }}>
          {summary && <RadarPanel runway={summary.runway} onDigest={handleDigest} sending={sending} />}
          <AddTransaction categories={categories} onAdded={refresh} onToast={showToast} />
          {summary && <CategoryChart data={summary.expenseByCategory} />}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
