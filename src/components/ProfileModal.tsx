import { useState } from 'react';
import { X, User, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || '');
  const [bio, setBio] = useState(user?.bio || '');

  if (!user) return null;
  const initials = (user.name || user.email || 'U').slice(0, 2).toUpperCase();

  function save() {
    updateProfile({ name, role, bio });
    setEditing(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal profile-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{editing ? 'Edit Profile' : 'Profile'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="profile-header">
          <div className="profile-avatar">{initials}</div>
          {!editing ? (
            <>
              <h3 style={{ margin: '8px 0 4px' }}>{user.name}</h3>
              <p className="muted" style={{ margin: 0 }}>{user.email}</p>
              {user.role && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{user.role}</p>}
            </>
          ) : null}
        </div>

        {!editing ? (
          <>
            {user.bio && (
              <div className="profile-section">
                <label>About</label>
                <p style={{ margin: 0 }}>{user.bio}</p>
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => { logout(); onClose(); }}>
                <LogOut size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Sign Out
              </button>
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                <User size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Edit Profile
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Display Name</label>
              <input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={user.email} disabled style={{ background: '#F3F4F6' }} />
            </div>
            <div className="field">
              <label>Role / Title</label>
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Product Manager" />
            </div>
            <div className="field">
              <label>About</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="Short bio…"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #E5E9F0',
                  borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
