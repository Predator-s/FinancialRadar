import React from 'react';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function SummaryCards({ totals, count }) {
  return (
    <div className="grid stats">
      <div className="card stat">
        <div className="stat-head">
          <span className="label">Balance</span>
          <span className="stat-ic"><Wallet size={16} /></span>
        </div>
        <div className={'value ' + (totals.balance >= 0 ? 'pos' : 'neg')}>{inr(totals.balance)}</div>
        <div className="sub">{count} transactions</div>
      </div>
      <div className="card stat">
        <div className="stat-head">
          <span className="label">Income</span>
          <span className="stat-ic pos"><TrendingUp size={16} /></span>
        </div>
        <div className="value pos">{inr(totals.income)}</div>
        <div className="sub">money in</div>
      </div>
      <div className="card stat">
        <div className="stat-head">
          <span className="label">Expenses</span>
          <span className="stat-ic neg"><TrendingDown size={16} /></span>
        </div>
        <div className="value neg">{inr(totals.expense)}</div>
        <div className="sub">money out</div>
      </div>
      <div className="card stat">
        <div className="stat-head">
          <span className="label">Savings rate</span>
          <span className="stat-ic"><PiggyBank size={16} /></span>
        </div>
        <div className={'value ' + (totals.savingsRate >= 0 ? 'pos' : 'neg')}>{totals.savingsRate}%</div>
        <div className="sub">of income kept</div>
      </div>
    </div>
  );
}
