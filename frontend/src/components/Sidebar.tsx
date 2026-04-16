import { Home, Video, MessageSquare, Calendar, Sparkles } from 'lucide-react';

type Tab = 'home' | 'meetings' | 'chat' | 'scheduler' | 'summariser';

export default function Sidebar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const items: { key: Tab; label: string; icon: any }[] = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'meetings', label: 'Meetings', icon: Video },
    { key: 'chat', label: 'Team Chat', icon: MessageSquare },
    { key: 'scheduler', label: 'Scheduler', icon: Calendar },
    { key: 'summariser', label: 'AI Summariser', icon: Sparkles },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">MeetingAI</div>
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={`sidebar-item ${active === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
