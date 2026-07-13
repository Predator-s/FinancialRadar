import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotifIcon } from '../icons.jsx';

const ago = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function NotificationBell({ data, onOpen, onRead, onReadAll }) {
  const [open, setOpen] = useState(false);
  const unread = data?.unread || 0;
  const items = data?.items || [];

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
  }

  return (
    <div className="bell-wrap">
      <button className="bell" onClick={toggle} title="Notifications">
        <Bell size={19} />
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setOpen(false)} />
          <div className="dropdown">
            <div className="dhead">
              <span>Notifications</span>
              {unread > 0 && <button onClick={onReadAll}>Mark all read</button>}
            </div>
            <div className="notif-list">
              {items.length === 0 ? (
                <div className="empty">No notifications yet</div>
              ) : (
                items.map((n) => (
                  <div key={n.id} className={'notif ' + (n.read ? '' : 'unread')} onClick={() => onRead?.(n.id)}>
                    <span className={'notif-ic ' + n.type}><NotifIcon type={n.type} size={16} /></span>
                    <div style={{ flex: 1 }}>
                      <div className="nt">{n.title}</div>
                      <div className="nm">{n.message}</div>
                      <div className="ntime">{ago(n.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {data?.channels?.length > 0 && (
              <div className="channels">Delivering via: {data.channels.join(', ')}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
