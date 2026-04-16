import { useEffect, useState } from 'react';
import { Trash2, Plus, Calendar, Clock, Users, Video, Copy, Check, X } from 'lucide-react';
import { generateMeetingId, formatMeetingId } from '../lib/zoomMeeting';
import { useAuth } from '../lib/auth';

type Scheduled = {
  id: string;
  title: string;
  meetingNumber: string;
  when: string;
  durationMin?: number;
  participants?: string[];
  description?: string;
};

const KEY = 'meetingai_scheduled';

function load(): Scheduled[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(items: Scheduled[]) { localStorage.setItem(KEY, JSON.stringify(items)); }

function groupMeetings(items: Scheduled[]) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const groups: Record<string, Scheduled[]> = { Today: [], Tomorrow: [], Upcoming: [], Past: [] };
  items.forEach(i => {
    const d = i.when.slice(0, 10);
    const t = new Date(i.when).getTime();
    if (t < now.getTime() && d !== today) groups.Past.push(i);
    else if (d === today) groups.Today.push(i);
    else if (d === tomorrow) groups.Tomorrow.push(i);
    else groups.Upcoming.push(i);
  });
  return groups;
}

export default function Scheduler({ onJoin }: { onJoin: (meetingNumber: string) => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Scheduled[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [participants, setParticipants] = useState('');
  const [description, setDescription] = useState('');
  const [generatedId, setGeneratedId] = useState('');

  useEffect(() => { setItems(load()); }, []);

  function openModal() {
    if (!user?.email) return;
    const newId = generateMeetingId(user.email);
    setGeneratedId(newId);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    setDate(now.toISOString().slice(0, 10));
    setTime(now.toTimeString().slice(0, 5));
    setTitle('');
    setParticipants('');
    setDescription('');
    setDuration(30);
    setShowModal(true);
  }

  function add() {
    if (!title || !date || !time) return;
    const when = `${date}T${time}`;
    const next = [
      ...items,
      {
        id: 's_' + Date.now(),
        title,
        meetingNumber: generatedId,
        when,
        durationMin: duration,
        participants: participants.split(',').map(s => s.trim()).filter(Boolean),
        description,
      },
    ].sort((a, b) => a.when.localeCompare(b.when));
    setItems(next); save(next);
    setShowModal(false);
  }

  function remove(id: string) {
    if (!confirm('Cancel this scheduled meeting?')) return;
    const next = items.filter(i => i.id !== id);
    setItems(next); save(next);
  }

  function copyLink(meetingNumber: string) {
    const link = `${window.location.origin}/?join=${meetingNumber}`;
    navigator.clipboard.writeText(link);
    setCopied(meetingNumber);
    setTimeout(() => setCopied(null), 2000);
  }

  const grouped = groupMeetings(items);
  const ordered = ['Today', 'Tomorrow', 'Upcoming', 'Past'].filter(g => grouped[g].length > 0);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Calendar size={22} style={{ verticalAlign: 'middle', marginRight: 6, color: '#2D8CFF' }} />
            Scheduler
          </h1>
          <p className="page-sub">Schedule and manage your upcoming Zoom meetings</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Schedule Meeting
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty-card">
          <Calendar size={36} style={{ color: '#9CA3AF', marginBottom: 12 }} />
          <p>No scheduled meetings yet.</p>
          <button className="btn btn-primary" onClick={openModal}>Schedule your first meeting</button>
        </div>
      ) : (
        ordered.map(groupName => (
          <div key={groupName} className="schedule-group">
            <h3 className="schedule-group-title">{groupName}</h3>
            <div className="schedule-list">
              {grouped[groupName].map(item => {
                const dt = new Date(item.when);
                const isPast = groupName === 'Past';
                return (
                  <div key={item.id} className={`schedule-card ${isPast ? 'past' : ''}`}>
                    <div className="schedule-time-block">
                      <div className="schedule-date">
                        {dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="schedule-time">
                        {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {item.durationMin && (
                        <div className="schedule-duration">{item.durationMin} min</div>
                      )}
                    </div>
                    <div className="schedule-content">
                      <div className="schedule-title">{item.title}</div>
                      {item.description && <div className="schedule-desc">{item.description}</div>}
                      <div className="schedule-meta">
                        <span><Video size={12} /> #{formatMeetingId(item.meetingNumber)}</span>
                        {item.participants && item.participants.length > 0 && (
                          <span><Users size={12} /> {item.participants.length} invited</span>
                        )}
                      </div>
                      {item.participants && item.participants.length > 0 && (
                        <div className="schedule-participants">
                          {item.participants.map((p, i) => (
                            <span key={i} className="participant-chip">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="schedule-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => copyLink(item.meetingNumber)}
                        title="Copy invite link"
                      >
                        {copied === item.meetingNumber ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
                      </button>
                      {!isPast && (
                        <button className="btn btn-primary btn-sm" onClick={() => onJoin(item.meetingNumber)}>
                          <Video size={12} /> Start
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        onClick={() => remove(item.id)}
                        title="Delete"
                        style={{ color: '#DC2626' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Schedule a Meeting</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div className="schedule-id-banner">
              <div>
                <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Meeting ID</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Menlo, monospace', marginTop: 2 }}>
                  {formatMeetingId(generatedId)}
                </div>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>auto-generated</span>
            </div>

            <div className="field">
              <label>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weekly team sync" autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Date *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Time *</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
              <div className="field">
                <label>Duration</label>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="select-input">
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Invite (comma-separated emails)</label>
              <input value={participants} onChange={e => setParticipants(e.target.value)} placeholder="alice@example.com, bob@example.com" />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Agenda, links, notes…"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #E5E9F0',
                  borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                }}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={add} disabled={!title || !date || !time}>
                <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
