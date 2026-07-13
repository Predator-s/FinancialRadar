import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { CategoryIcon } from '../icons.jsx';

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function TransactionList({ transactions, categories, onDelete }) {
  const [typeF, setTypeF] = useState('');
  const [catF, setCatF] = useState('');

  const allCats = [...new Set([...(categories.income || []), ...(categories.expense || [])])];
  const rows = transactions.filter(
    (t) => (!typeF || t.type === typeF) && (!catF || t.category === catF)
  );

  return (
    <div className="card">
      <h3>Transactions</h3>
      <div className="filters">
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={catF} onChange={(e) => setCatF(e.target.value)}>
          <option value="">All categories</option>
          {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="empty">No transactions yet. Add one to get started.</div>
      ) : (
        <div className="tx-list">
          {rows.map((t) => (
            <div key={t.id} className={'tx ' + t.type}>
              <div className="dot"><CategoryIcon category={t.category} size={18} /></div>
              <div className="info">
                <div className="cat">
                  {t.category}
                  {t.anomaly && <span className="flag"><AlertTriangle size={11} /> unusual</span>}
                </div>
                {t.note && <div className="note">{t.note}</div>}
                <div className="date">{t.date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="amt">{t.type === 'income' ? '+' : '−'}{inr(t.amount)}</div>
              </div>
              <button className="del" title="Delete" onClick={() => onDelete(t.id)}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
