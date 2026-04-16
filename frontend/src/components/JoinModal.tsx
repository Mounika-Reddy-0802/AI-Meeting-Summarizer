import { useState } from 'react';

export default function JoinModal({
  onJoin,
  onClose,
}: {
  onJoin: (data: { meetingNumber: string; password: string; userName: string }) => void;
  onClose: () => void;
}) {
  const [meetingNumber, setMeetingNumber] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Join Zoom Meeting</h2>
        <div className="field">
          <label>Meeting ID or Link</label>
          <input
            value={meetingNumber}
            onChange={e => setMeetingNumber(e.target.value)}
            placeholder="123 456 7890"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Passcode (optional)</label>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Passcode"
          />
        </div>
        <div className="field">
          <label>Your name</label>
          <input
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Display name"
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!meetingNumber || !userName}
            onClick={() => {
              // Strip non-digits from meeting id (allow paste of full Zoom link)
              const digits = meetingNumber.match(/\d{9,11}/)?.[0] || meetingNumber.replace(/\D/g, '');
              onJoin({ meetingNumber: digits, password, userName });
            }}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
