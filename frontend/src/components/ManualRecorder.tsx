import { useEffect, useRef, useState } from 'react';
import { X, Mic, Square } from 'lucide-react';
import { useApi } from '../lib/api';
import type { TranscriptEntry } from '../lib/mockStore';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const DEEPGRAM_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_KEY || '';

export default function ManualRecorder({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (meetingId: string) => void;
}) {
  const api = useApi();
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const startedAtRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mockIvRef = useRef<any>(null);
  const tickIvRef = useRef<any>(null);

  useEffect(() => () => {
    if (mockIvRef.current) clearInterval(mockIvRef.current);
    if (tickIvRef.current) clearInterval(tickIvRef.current);
    recorderRef.current?.stop();
    wsRef.current?.close();
  }, []);

  function getParticipantList() {
    return participants.split(',').map(s => s.trim()).filter(Boolean);
  }

  async function startRecording() {
    if (!title.trim()) { alert('Please give the meeting a title'); return; }
    startedAtRef.current = Date.now();
    setRecording(true);
    setElapsed(0);
    setTranscript([]);
    tickIvRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);

    if (USE_MOCK) {
      const lines = [
        { speaker: 'You', text: 'Let us start the meeting.' },
        { speaker: 'Team Member', text: 'I have updates on the project status.' },
        { speaker: 'You', text: 'Great, please share the highlights.' },
        { speaker: 'Team Member', text: 'We hit our milestones this week.' },
        { speaker: 'You', text: 'Excellent. Any blockers?' },
        { speaker: 'Team Member', text: 'One issue with the deployment pipeline.' },
        { speaker: 'You', text: 'Let us prioritize that for tomorrow.' },
      ];
      let i = 0;
      mockIvRef.current = setInterval(() => {
        if (i >= lines.length || !recorderRef.current && !mockIvRef.current) return;
        const ts = Date.now() - startedAtRef.current;
        setTranscript(t => [...t, { ts, speaker: lines[i].speaker, text: lines[i].text }]);
        i++;
      }, 2200);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=false&encoding=opus',
        ['token', DEEPGRAM_KEY]
      );
      wsRef.current = ws;
      ws.onmessage = m => {
        try {
          const d = JSON.parse(m.data);
          const text = d.channel?.alternatives?.[0]?.transcript;
          if (text?.trim()) {
            const ts = Date.now() - startedAtRef.current;
            setTranscript(t => [...t, { ts, speaker: 'You', text }]);
          }
        } catch {}
      };
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recorderRef.current = rec;
      rec.ondataavailable = e => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
      };
      rec.start(3000);
    } catch (e: any) {
      alert('Microphone access failed: ' + e.message);
      stopWithoutSave();
    }
  }

  function stopWithoutSave() {
    setRecording(false);
    if (mockIvRef.current) { clearInterval(mockIvRef.current); mockIvRef.current = null; }
    if (tickIvRef.current) { clearInterval(tickIvRef.current); tickIvRef.current = null; }
    recorderRef.current?.stop(); recorderRef.current = null;
    setTimeout(() => wsRef.current?.close(), 300);
  }

  async function stopAndSave() {
    setBusy(true);
    stopWithoutSave();
    const durationMs = Date.now() - startedAtRef.current;
    try {
      const { meetingId } = await api.saveTranscript({
        transcript,
        meetingTitle: title,
        type: 'manual',
        durationMs,
        participants: getParticipantList(),
      });
      await api.generateSummary(meetingId);
      onSaved(meetingId);
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const ss = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="modal-overlay" onClick={() => !recording && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Record In-Person Meeting</h2>
          <button className="icon-btn" onClick={onClose} disabled={recording}><X size={18} /></button>
        </div>

        <div className="field">
          <label>Meeting title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Sprint Retrospective"
            disabled={recording}
          />
        </div>
        <div className="field">
          <label>Participants (comma-separated)</label>
          <input
            value={participants}
            onChange={e => setParticipants(e.target.value)}
            placeholder="Alice, Bob, Charlie"
            disabled={recording}
          />
        </div>

        {recording && (
          <div className="recorder-active">
            <div className="recorder-pulse" />
            <span className="recorder-time">{mm}:{ss}</span>
            <span className="recorder-label">Recording</span>
          </div>
        )}

        {transcript.length > 0 && (
          <div className="recorder-transcript">
            {transcript.slice(-6).map((t, i) => (
              <p key={i}><b>{t.speaker}:</b> {t.text}</p>
            ))}
          </div>
        )}

        <div className="modal-actions">
          {!recording ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={startRecording} disabled={busy}>
                <Mic size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Start Recording
              </button>
            </>
          ) : (
            <button className="btn btn-danger" onClick={stopAndSave} disabled={busy}>
              {busy ? 'Saving…' : (
                <><Square size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Stop & Save</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
