import { Search, Bell } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Topbar({
  search,
  onSearch,
  onBellClick,
  onAvatarClick,
}: {
  search: string;
  onSearch: (q: string) => void;
  onBellClick: () => void;
  onAvatarClick: () => void;
}) {
  const { user } = useAuth();
  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="topbar">
      <div className="search-box">
        <Search className="icon" size={16} />
        <input
          placeholder="Search"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
      <div className="topbar-spacer" />
      <button className="icon-btn" onClick={onBellClick} title="Meeting History">
        <Bell size={18} />
      </button>
      <button className="topbar-user-btn" onClick={onAvatarClick} title="Profile">
        <span>{user?.email}</span>
        <div className="avatar">{initials}</div>
      </button>
    </div>
  );
}
