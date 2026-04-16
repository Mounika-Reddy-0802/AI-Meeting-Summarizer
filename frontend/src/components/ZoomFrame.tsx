import { useEffect, useRef, useState } from 'react';
import { useApi } from '../lib/api';

export default function ZoomFrame({
  meetingNumber,
  password,
  userName,
  role,
  zak,
  onLeft,
}: {
  meetingNumber: string;
  password: string;
  userName: string;
  role?: number;
  zak?: string;
  onLeft: () => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const api = useApi();
  const [status, setStatus] = useState<string>('Connecting…');
  const [iframeReady, setIframeReady] = useState(false);
  const [credentials, setCredentials] = useState<{ signature: string; sdkKey: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('Getting signature…');
    const joinRole = role ?? 0;
    api.getZoomSignature(meetingNumber, joinRole)
      .then(({ signature, sdkKey }) => {
        if (cancelled) return;
        if (!signature || !sdkKey) {
          setStatus('Failed: empty signature returned.');
          return;
        }
        setCredentials({ signature, sdkKey });
        setStatus('Loading Zoom…');
      })
      .catch(e => {
        if (!cancelled) setStatus('Failed: ' + e.message);
      });
    return () => { cancelled = true; };
  }, [meetingNumber, role]);

  useEffect(() => {
    if (!iframeReady || !credentials || !ref.current?.contentWindow) return;
    setStatus('Joining meeting as ' + (role === 1 ? 'host' : 'participant') + '…');
    ref.current.contentWindow.postMessage(
      {
        signature: credentials.signature,
        sdkKey: credentials.sdkKey,
        meetingNumber,
        userName,
        password,
        zak: zak || '',
        role: role ?? 0,
      },
      '*'
    );
  }, [iframeReady, credentials, meetingNumber, userName, password, zak, role]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'zoom-joined') setStatus('In meeting');
      if (e.data?.type === 'zoom-left') onLeft();
      if (e.data?.type === 'zoom-error') {
        const reason = e.data.err?.reason || e.data.err?.errorMessage || JSON.stringify(e.data.err);
        setStatus('Zoom error: ' + reason);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <div className="zoom-frame-wrap">
      <p className="zoom-frame-status">{status}</p>
      <iframe
        ref={ref}
        src="/zoom-meeting-frame.html"
        onLoad={() => setIframeReady(true)}
        allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}