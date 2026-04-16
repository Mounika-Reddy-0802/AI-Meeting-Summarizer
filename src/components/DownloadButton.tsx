import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, FileType } from 'lucide-react';
import { downloadSummary } from '../lib/download';
import type { Meeting } from '../lib/mockStore';

export default function DownloadButton({
  meeting,
  variant = 'primary',
  size = 'md',
}: {
  meeting: Meeting;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handle(format: 'pdf' | 'docx') {
    downloadSummary(meeting, format);
    setOpen(false);
  }

  return (
    <div className="download-dropdown" ref={ref}>
      <button
        className={`btn btn-${variant} download-btn`}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o); }}
        style={size === 'sm' ? { padding: '6px 12px', fontSize: 12 } : undefined}
      >
        <Download size={size === 'sm' ? 12 : 14} />
        <span>Download</span>
        <ChevronDown size={size === 'sm' ? 12 : 14} />
      </button>
      {open && (
        <div className="download-menu" onClick={(e) => e.stopPropagation()}>
          <button onClick={(e) => { e.preventDefault(); handle('pdf'); }}>
            <FileType size={14} /> PDF
          </button>
          <button onClick={(e) => { e.preventDefault(); handle('docx'); }}>
            <FileText size={14} /> DOCX (Word)
          </button>
        </div>
      )}
    </div>
  );
}
