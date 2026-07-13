import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// Butter + Green harmonised categorical palette, saturated to read on the
// light warm-white cards (deep greens → teal → rust → gold).
const COLORS = ['#013e37', '#0b7a5e', '#2a9d8f', '#c0451f', '#b07d10', '#3f7d3a', '#8c5a1b', '#0f9d76', '#a83a12', '#5e8c3e'];
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

function TipBox({ children }) {
  return (
    <div style={{ background: '#fffdf6', border: '1px solid #e6d9a3', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#013e37', boxShadow: '0 6px 22px rgba(1,62,55,0.12)' }}>
      {children}
    </div>
  );
}

export function CategoryChart({ data }) {
  if (!data?.length) return <div className="card"><h3>Spending by category</h3><div className="chart-empty">No expenses yet</div></div>;
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <div className="card">
      <h3>Spending by category</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="category" cx="50%" cy="50%"
            innerRadius={62} outerRadius={100} paddingAngle={2} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={({ payload }) => payload?.[0] && (
            <TipBox>
              <strong>{payload[0].name}</strong><br />
              {inr(payload[0].value)} · {((payload[0].value / total) * 100).toFixed(1)}%
            </TipBox>
          )} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {data.slice(0, 6).map((d, i) => (
          <span key={d.category} style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
            {d.category}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BalanceTrendChart({ data }) {
  if (!data?.length) return <div className="card"><h3>Balance trend</h3><div className="chart-empty">No data yet</div></div>;
  return (
    <div className="card">
      <h3>Running balance</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#013e37" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#013e37" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(1,62,55,0.10)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#5f807a', fontSize: 11 }}
            tickFormatter={(d) => d.slice(5)} minTickGap={24} />
          <YAxis tick={{ fill: '#5f807a', fontSize: 11 }} tickFormatter={(v) => '₹' + (v / 1000) + 'k'} />
          <Tooltip content={({ payload, label }) => payload?.[0] && (
            <TipBox>
              <strong>{label}</strong><br />
              Balance: {inr(payload[0].payload.balance)}<br />
              <span style={{ color: payload[0].payload.net >= 0 ? '#0b7a5e' : '#c0451f' }}>
                Net: {payload[0].payload.net >= 0 ? '+' : ''}{inr(payload[0].payload.net)}
              </span>
            </TipBox>
          )} />
          <Area type="monotone" dataKey="balance" stroke="#013e37" strokeWidth={2.2} fill="url(#bal)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
