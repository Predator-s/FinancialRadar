import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Sparkles, Wand2, Plus, Loader2 } from 'lucide-react';
import { api } from '../api.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function AddTransaction({ categories, onAdded, onToast }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [quick, setQuick] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pool = categories[type] || [];

  function switchType(t) {
    setType(t);
    setCategory(''); // reset — category pools differ per type
  }

  // Natural-language quick-add: "coffee 250" → fills the form via /parse.
  async function handleQuick(e) {
    e.preventDefault();
    if (!quick.trim()) return;
    setError('');
    try {
      const { draft } = await api.parse(quick, type);
      if (draft.amount) setAmount(String(draft.amount));
      if (draft.category) setCategory(draft.category);
      if (draft.note) setNote(draft.note);
      setQuick('');
      onToast?.(`Parsed → ${draft.category} · ₹${draft.amount ?? '?'}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.addTransaction({ type, amount, category, date, note });
      // Surface the anomaly verdict right at the point of entry.
      if (res.radar?.anomalous) {
        onToast?.(`🚨 Flagged as unusual for ${category} (score ${res.radar.score})`);
      } else {
        onToast?.('Transaction added');
      }
      setAmount(''); setNote(''); setCategory('');
      onAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Add transaction</h3>

      <div className="seg">
        <button className={type === 'income' ? 'active-income' : ''} onClick={() => switchType('income')} type="button">
          <ArrowDownCircle size={15} /> Income
        </button>
        <button className={type === 'expense' ? 'active-expense' : ''} onClick={() => switchType('expense')} type="button">
          <ArrowUpCircle size={15} /> Expense
        </button>
      </div>

      <form onSubmit={handleQuick}>
        <div className="quick">
          <input
            placeholder='Quick add — try "coffee 250"'
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
          />
          <button className="btn ghost icon-btn" type="submit" style={{ margin: 0 }}>
            <Wand2 size={15} /> Parse
          </button>
        </div>
        <div className="hint"><Sparkles size={13} /> Type free text; we guess the amount + category, then you confirm below.</div>
      </form>

      <form onSubmit={submit}>
        <div className="row">
          <div>
            <label>Amount (₹)</label>
            <input type="number" step="0.01" min="0" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>
          <div>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="" disabled>Select…</option>
              {pool.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <label>Date</label>
        <input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />

        <label>Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. lunch with team" maxLength={200} />

        {error && <div className="err">{error}</div>}

        <button className="btn icon-btn" type="submit" disabled={busy}>
          {busy
            ? <><Loader2 size={16} className="spin" /> Adding…</>
            : <><Plus size={16} /> Add {type}</>}
        </button>
      </form>
    </div>
  );
}
