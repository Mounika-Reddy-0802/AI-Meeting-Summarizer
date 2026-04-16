import Link from 'next/link';
import { X, FileText, CheckCircle } from 'lucide-react';
import DownloadButton from './DownloadButton';
import type { Meeting } from '../lib/mockStore';

export default function SummaryModal({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal summary-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={22} style={{ color: '#10B981' }} />
            <h2 style={{ margin: 0 }}>Meeting ended</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          Your summary is ready. Review or download below.
        </p>

        <div className="summary-modal-card">
          <h3 style={{ marginTop: 0 }}>{meeting.title}</h3>
          <div className="summary-card-meta">
            {new Date(meeting.timestamp).toLocaleString()}
            {meeting.durationMs && <> · {Math.round(meeting.durationMs / 60000)} min</>}
          </div>
          <h4>Summary</h4>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{meeting.summary}</p>

          {meeting.actionItems && meeting.actionItems.length > 0 && (
            <>
              <h4>Action Items</h4>
              <ul style={{ marginTop: 4 }}>
                {meeting.actionItems.map(a => (
                  <li key={a.itemId}>
                    {a.text}
                    {a.owner && <span className="muted"> — {a.owner}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <Link href={`/meeting/${meeting.meetingId}`} className="btn btn-secondary" onClick={onClose}>
            <FileText size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            View Full Transcript
          </Link>
          <DownloadButton meeting={meeting} variant="primary" />
        </div>
      </div>
    </div>
  );
}
