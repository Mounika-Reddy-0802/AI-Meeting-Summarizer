import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Users, Clock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/api';
import { formatTs } from '../../lib/download';
import DownloadButton from '../../components/DownloadButton';
import type { Meeting } from '../../lib/mockStore';

export default function MeetingDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const api = useApi();
  const [data, setData] = useState<Meeting | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && !user) router.replace('/login');
  }, [user]);

  useEffect(() => {
    if (!user || !router.query.id) return;
    api.getMeeting(String(router.query.id))
      .then((d: any) => d ? setData(d) : setError('Meeting not found'))
      .catch(e => setError(e.message));
  }, [user, router.query.id]);

  if (!router.isReady) return <p style={{ padding: 24 }}>Loading…</p>;
  if (!user) return null;

  return (
    <div className="content" style={{ padding: 24, justifyContent: 'flex-start' }}>
      <div className="detail-wrap">
        <Link href="/" className="back-link">
          <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Back to Dashboard
        </Link>

        {error && <div className="detail-card"><p style={{ color: '#DC2626' }}>{error}</p></div>}
        {!error && !data && <p>Loading meeting…</p>}

        {data && (
          <div className="detail-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <h1>{data.title}</h1>
                <div className="meta">
                  <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {new Date(data.timestamp).toLocaleString()}
                  {data.durationMs && <> · {Math.round(data.durationMs / 60000)} min</>}
                  {data.zoomMeetingNumber && <> · Zoom #{data.zoomMeetingNumber}</>}
                  {data.type === 'manual' && <span className="tag">In-person</span>}
                </div>
              </div>
              <DownloadButton meeting={data} variant="primary" />
            </div>

            {data.participants && data.participants.length > 0 && (
              <div className="participants-row">
                <Users size={14} style={{ color: '#6B7280' }} />
                {data.participants.map((p, i) => (
                  <span key={i} className="participant-chip">{p}</span>
                ))}
              </div>
            )}

            <h3>Summary</h3>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {data.summary || '(no summary yet)'}
            </div>

            {data.actionItems && data.actionItems.length > 0 && (
              <>
                <h3>Action Items</h3>
                <ul>
                  {data.actionItems.map((a) => (
                    <li key={a.itemId}>
                      {a.text}
                      {a.owner && <span style={{ color: '#6B7280' }}> — {a.owner}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3>Transcript</h3>
            <div className="transcript-detail">
              {(!data.transcript || data.transcript.length === 0) ? (
                <p className="muted">No transcript available.</p>
              ) : (
                data.transcript.map((e: any, i: number) => {
                  const speaker = typeof e === 'string' ? 'Unknown' : (e.speaker || 'Unknown');
                  const text = typeof e === 'string' ? e : e.text;
                  const ts = typeof e === 'string' ? 0 : (e.ts || 0);
                  const prevSpeaker = i > 0 && typeof data.transcript![i - 1] !== 'string'
                    ? (data.transcript![i - 1] as any).speaker
                    : null;
                  const sameAsPrev = speaker === prevSpeaker;

                  return (
                    <div key={i} className={`transcript-line ${sameAsPrev ? 'same-speaker' : ''}`}>
                      <div className="transcript-meta">
                        {!sameAsPrev && <div className="transcript-speaker">{speaker}</div>}
                        <div className="transcript-time">{formatTs(ts)}</div>
                      </div>
                      <div className="transcript-text">{text}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}
export async function getStaticProps() {
  return { props: {} };
}
