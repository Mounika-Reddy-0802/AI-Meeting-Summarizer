import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useApi } from '../lib/api';

export default function HistoryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const api = useApi();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const list = q ? await api.search(q) : await api.listMeetings();
        setItems(Array.isArray(list) ? list : []);
      } catch (e) {
        setItems([]);
      }
    };
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [open, q]);

  return (
    <div className={`drawer ${open ? 'open' : ''}`}>
      <div className="drawer-header">
        <h3>Meeting History</h3>
        <button className="icon-btn" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="drawer-body">
        <div className="drawer-search">
          <input
            placeholder="Search meetings..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        {items.length === 0 ? (
          <div className="empty-state">
            {q ? 'No matches.' : 'No past meetings yet. Start one to see it here.'}
          </div>
        ) : (
          items.map((m: any) => (
            <Link
              key={m.meetingId}
              href={`/meeting/${m.meetingId}`}
              className="history-item"
              onClick={onClose}
            >
              <div className="title">{m.title}</div>
              <div className="when">{new Date(m.timestamp).toLocaleString()}</div>
              {m.summarySnippet && <div className="snip">{m.summarySnippet}</div>}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}