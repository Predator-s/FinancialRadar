import React from 'react';
import { Radar, Bell, Loader2 } from 'lucide-react';

const inr = (n) => '₹' + Number(Math.abs(n)).toLocaleString('en-IN');

// The "Financial Radar" — burn-rate runway forecast. This is the unique twist's
// front-facing surface: it turns raw balance into a forward-looking answer.
export default function RadarPanel({ runway, onDigest, sending }) {
  const { status, runwayDays, dailyNet } = runway;
  const sustainable = runwayDays == null;

  return (
    <div className={'card radar ' + (sustainable ? 'ok' : status)}>
      <h3><Radar size={15} className="h3-ic" /> Financial Radar</h3>
      <span className={'runway-badge ' + (sustainable ? 'sustainable' : status)}>
        <span className="dot-pulse" />
        {sustainable ? 'Sustainable' : status === 'critical' ? 'Critical' : status === 'warning' ? 'Watch out' : 'Healthy'}
      </span>

      {sustainable ? (
        <>
          <div className="radar-big pos" style={{ color: 'var(--green)' }}>Cash-flow positive</div>
          <div className="radar-help">
            Over the last 30 days you're net <strong>+{inr(dailyNet)}/day</strong>. At this rate your
            balance keeps growing — no runway limit.
          </div>
        </>
      ) : (
        <>
          <div className="radar-big">{runwayDays} days</div>
          <div className="radar-help">
            Burning <strong>{inr(dailyNet)}/day</strong> (trailing 30d). At this pace your current
            balance lasts about <strong>{runwayDays} more days</strong>.
          </div>
        </>
      )}

      <button className="btn ghost icon-btn" style={{ marginTop: 16 }} onClick={onDigest} disabled={sending}>
        {sending
          ? <><Loader2 size={16} className="spin" /> Sending…</>
          : <><Bell size={16} /> Send me a ledger digest</>}
      </button>
    </div>
  );
}
