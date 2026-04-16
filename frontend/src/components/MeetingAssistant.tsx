import { useRef, useState } from 'react';
import { useApi } from '../lib/api';
import type { Meeting, TranscriptEntry } from '../lib/mockStore';

const DEEPGRAM_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_KEY || '';

export default function MeetingAssistant({
  zoomMeetingNumber,
  userName,
  onSummaryReady,
}: {
  zoomMeetingNumber?: string;
  userName?: string;
  onSummaryReady?: (meeting: Meeting) => void;
}) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const startedAtRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const api = useApi();

  function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  async function start() {
    if (!DEEPGRAM_KEY) {
      alert('Missing NEXT_PUBLIC_DEEPGRAM_KEY in .env.local');
      return;
    }

    startedAtRef.current = Date.now();
    setTranscript([]);
    chunksRef.current = [];
    setStatus('Requesting tab audio (pick the Zoom tab and TICK "Share tab audio")…');

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        alert('No tab audio captured.\n\nIn the picker:\n1. Pick the Zoom browser tab\n2. TICK "Share tab audio" at the bottom');
        stream.getTracks().forEach(t => t.stop());
        setStatus('');
        return;
      }
      stream.getVideoTracks().forEach(t => t.stop());
      streamRef.current = stream;

      // Also record raw audio for S3 upload
      const audioOnlyStream = new MediaStream([audioTrack]);
      try {
        const rec = new MediaRecorder(audioOnlyStream, { mimeType: 'audio/webm;codecs=opus' });
        recorderRef.current = rec;
        rec.ondataavailable = e => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start(3000);
      } catch (e) {
        console.warn('MediaRecorder not available for S3 upload:', e);
      }

      // Web Audio pipeline for Deepgram (raw PCM)
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      sourceRef.current = source;
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Deepgram WebSocket
      setStatus('Connecting to Deepgram…');
      const url = `wss://api.deepgram.com/v1/listen?` +
        `model=nova-2&encoding=linear16&sample_rate=16000&channels=1&smart_format=true&interim_results=false&punctuate=true`;
      const ws = new WebSocket(url, ['token', DEEPGRAM_KEY]);
      wsRef.current = ws;

      ws.onopen = () => setStatus('🎙 Listening… speak in the Zoom tab.');
      ws.onerror = (e) => {
        console.error('Deepgram WS error', e);
        setStatus('Deepgram connection error — check console + key.');
      };
      ws.onclose = (e) => {
        if (recording) setStatus(`Deepgram closed: ${e.code} ${e.reason || ''}`);
      };
      ws.onmessage = (m) => {
        try {
          const d = JSON.parse(m.data);
          const text = d.channel?.alternatives?.[0]?.transcript;
          if (text?.trim()) {
            const ts = Date.now() - startedAtRef.current;
            setTranscript(t => [...t, { ts, speaker: 'Speaker', text }]);
          }
        } catch {}
      };

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const pcm = e.inputBuffer.getChannelData(0);
        const buf = floatTo16BitPCM(pcm);
        ws.send(buf);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      audioTrack.onended = () => { if (recording) stop(); };
      setRecording(true);
    } catch (e: any) {
      alert('Could not start: ' + (e.message || e));
      setStatus('');
    }
  }

  async function stop() {
    setBusy(true);
    setRecording(false);
    setStatus('Closing audio stream…');

    try {
      if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
      if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      if (recorderRef.current) { recorderRef.current.stop(); recorderRef.current = null; }
      if (wsRef.current) {
        try { wsRef.current.send(JSON.stringify({ type: 'CloseStream' })); } catch {}
        setTimeout(() => wsRef.current?.close(), 250);
      }
    } catch {}

    const durationMs = Date.now() - startedAtRef.current;
    const participants = Array.from(new Set(transcript.map(t => t.speaker)));

    try {
      // 1. Upload audio to S3 via pre-signed URL
      let audioKey: string | undefined;
      if (chunksRef.current.length > 0) {
        setStatus('Uploading audio to S3…');
        try {
          const { uploadUrl, audioKey: k } = await api.getUploadUrl();
          audioKey = k;
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': 'audio/webm' },
          });
        } catch (e) {
          console.warn('Audio upload failed (non-fatal):', e);
        }
      }

      // 2. Save transcript to DynamoDB
      setStatus('Saving transcript to DynamoDB…');
      const { meetingId } = await api.saveTranscript({
        transcript,
        audioKey,
        meetingTitle: `Meeting ${new Date().toLocaleString()}`,
        zoomMeetingNumber,
        type: 'zoom',
        durationMs,
        participants,
      });

      // 3. Generate AI summary via Gemini
      setStatus('Generating AI summary via Gemini…');
      const result = await api.generateSummary(meetingId);
      setSummary(result.summary || '');
      setActionItems(result.actionItems || []);
      setStatus('');

      // 4. Trigger post-meeting popup
      if (onSummaryReady) {
        const fullMeeting = await api.getMeeting(meetingId);
        if (fullMeeting) onSummaryReady(fullMeeting);
      }
    } catch (e: any) {
      console.error('Pipeline failed:', e);
      alert('Pipeline failed: ' + e.message);
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="assistant-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3>Meeting Assistant</h3>
          {status && <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>{status}</p>}
        </div>
        <button
          className={`btn ${recording ? 'btn-danger' : 'btn-primary'}`}
          onClick={recording ? stop : start}
          disabled={busy}
        >
          {busy ? 'Processing…' : recording ? 'Stop Assistant' : 'Start Assistant'}
        </button>
      </div>

      <div className="transcript-feed">
        {transcript.length === 0 ? (
          <p style={{ color: '#9CA3AF', margin: 0 }}>
            Click <b>Start Assistant</b>, pick the Zoom tab, tick <b>"Share tab audio"</b>.
            Live transcript will appear here.
          </p>
        ) : (
          transcript.slice(-30).map((e, i) => (
            <p key={i}><b style={{ color: '#2D8CFF' }}>{e.speaker}:</b> {e.text}</p>
          ))
        )}
      </div>

      {summary && (
        <>
          <h3>Summary</h3>
          <div className="summary-block">{summary}</div>
        </>
      )}
      {actionItems.length > 0 && (
        <>
          <h3>Action Items</h3>
          <ul className="action-list">
            {actionItems.map((a, i) => (
              <li key={i}>
                {a.text}
                {a.owner && <span style={{ color: '#6B7280' }}> — {a.owner}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}