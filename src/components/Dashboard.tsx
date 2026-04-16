import { useEffect, useState } from 'react';
import { Video, Plus, Calendar, Sparkles } from 'lucide-react';

export default function Dashboard({
  onAction,
}: {
  onAction: (a: 'new' | 'join' | 'schedule' | 'ai') => void;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const cards = [
    { key: 'new' as const, icon: Video, label: 'New Meeting' },
    { key: 'join' as const, icon: Plus, label: 'Join' },
    { key: 'schedule' as const, icon: Calendar, label: 'Schedule' },
    { key: 'ai' as const, icon: Sparkles, label: 'AI Summariser' },
  ];

  return (
    <div className="dashboard-card">
      <div className="clock">{time}</div>
      <div className="date">{date}</div>
      <div className="action-grid">
        {cards.map(({ key, icon: Icon, label }) => (
          <button key={key} className="action-card" onClick={() => onAction(key)}>
            <div className="action-icon"><Icon size={22} /></div>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="tip-banner">
        Click <b>New Meeting</b> to instantly start a meeting with your auto-generated ID, or <b>Join</b> to enter someone else's meeting.
      </div>
    </div>
  );
}
