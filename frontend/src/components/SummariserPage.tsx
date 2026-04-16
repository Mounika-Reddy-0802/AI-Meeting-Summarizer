import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mic, Sparkles, FileText } from 'lucide-react';
import { useApi } from '../lib/api';
import type { Meeting } from '../lib/mockStore';
import ManualRecorder from './ManualRecorder';
import DownloadButton from './DownloadButton';

export default function SummariserPage() {
  const api = useApi();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.listMeetings()
      .then(m => setMeetings(Array.isArray(m) ? m : []))
      .catch(() => setMeetings([]));
  }, [refreshKey]);

  const withSummary = meetings.filter(m => m.summary);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Sparkles size={22} style={{ verticalAlign: 'middle', marginRight: 6, color: '#2D8CFF' }} />
            AI Summariser
          </h1>
          <p className="page-sub">All meeting summaries with downloadable transcripts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowRecorder(true)}>
          <Mic size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Record In-Person Meeting
        </button>
      </div>

      {withSummary.length === 0 ? (
        <div className="empty-card">
          <FileText size={36} style={{ color: '#9CA3AF', marginBottom: 12 }} />
          <p>No summaries yet. Run a Zoom meeting or record an in-person one.</p>
        </div>
      ) : (
        <div className="summary-list">
          {withSummary.map(m => (
            <div key={m.meetingId} className="summary-card">
              <Link href={`/meeting/${m.meetingId}`} className="summary-card-main">
                <div className="summary-card-title">{m.title}</div>
                <div className="summary-card-meta">
                  {new Date(m.timestamp).toLocaleString()}
                  {m.durationMs && <> · {Math.round(m.durationMs / 60000)} min</>}
                  {m.type === 'manual' && <span className="tag">In-person</span>}
                </div>
                <p className="summary-card-snippet">{m.summary}</p>
              </Link>
              <DownloadButton meeting={m} variant="secondary" size="sm" />
            </div>
          ))}
        </div>
      )}

      {showRecorder && (
        <ManualRecorder
          onClose={() => setShowRecorder(false)}
          onSaved={() => { setShowRecorder(false); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}