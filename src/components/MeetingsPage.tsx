import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Video, Plus, Clock } from 'lucide-react';
import { useApi } from '../lib/api';
import type { Meeting } from '../lib/mockStore';

export default function MeetingsPage({
  onJoinClick,
  activeWorkspace,
}: {
  onJoinClick: () => void;
  activeWorkspace: React.ReactNode;
}) {
  const api = useApi();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listMeetings()
      .then(m => { setMeetings(Array.isArray(m) ? m : []); setLoading(false); })
      .catch(() => { setMeetings([]); setLoading(false); });
  }, []);

  if (activeWorkspace) return <>{activeWorkspace}</>;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-sub">All your past Zoom meetings and recordings</p>
        </div>
        <button className="btn btn-primary" onClick={onJoinClick}>
          <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          New / Join
        </button>
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && meetings.length === 0 && (
        <div className="empty-card">
          <Video size={36} style={{ color: '#9CA3AF', marginBottom: 12 }} />
          <p>No meetings yet.</p>
          <button className="btn btn-primary" onClick={onJoinClick}>Start a meeting</button>
        </div>
      )}

      {!loading && meetings.length > 0 && (
        <div className="meeting-list">
          {meetings.map(m => (
            <Link key={m.meetingId} href={`/meeting/${m.meetingId}`} className="meeting-row">
              <div className="meeting-row-icon">
                {m.type === 'manual' ? '🎙' : <Video size={18} />}
              </div>
              <div className="meeting-row-main">
                <div className="meeting-row-title">{m.title}</div>
                <div className="meeting-row-meta">
                  <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {new Date(m.timestamp).toLocaleString()}
                  {m.durationMs && <> · {Math.round(m.durationMs / 60000)} min</>}
                  {m.participants?.length ? <> · {m.participants.length} participants</> : null}
                </div>
              </div>
              {m.summary && <span className="badge-summary">Summary ready</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}