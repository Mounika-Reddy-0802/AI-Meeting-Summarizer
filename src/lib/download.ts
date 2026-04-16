import type { Meeting } from './mockStore';

export type DownloadFormat = 'pdf' | 'docx';

export function formatTs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function safeFilename(title: string, ext: string) {
  return `${title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_summary.${ext}`;
}

export async function downloadSummary(meeting: Meeting, format: DownloadFormat = 'pdf') {
  if (format === 'pdf') return downloadPdf(meeting);
  if (format === 'docx') return downloadDocx(meeting);
}

// ---------- PDF ----------
async function downloadPdf(meeting: Meeting) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function writeText(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; lineGap?: number } = {}) {
    const size = opts.size || 11;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    if (opts.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    const lineH = size * 1.4;
    lines.forEach((line: string) => {
      ensureSpace(lineH);
      doc.text(line, margin, y);
      y += lineH;
    });
    y += opts.lineGap || 0;
  }

  function writeHeading(text: string) {
    y += 8;
    ensureSpace(28);
    writeText(text, { size: 14, bold: true, color: [45, 140, 255], lineGap: 4 });
  }

  // Header
  writeText('MEETING SUMMARY', { size: 9, bold: true, color: [120, 120, 120] });
  writeText(meeting.title, { size: 20, bold: true, lineGap: 6 });

  const metaParts: string[] = [];
  metaParts.push(new Date(meeting.timestamp).toLocaleString());
  if (meeting.durationMs) metaParts.push(`${Math.round(meeting.durationMs / 60000)} min`);
  if (meeting.zoomMeetingNumber) metaParts.push(`Zoom #${meeting.zoomMeetingNumber}`);
  writeText(metaParts.join('  ·  '), { size: 10, color: [120, 120, 120], lineGap: 6 });

  if (meeting.participants?.length) {
    writeText(`Participants: ${meeting.participants.join(', ')}`, { size: 10, color: [80, 80, 80], lineGap: 6 });
  }

  // Summary
  writeHeading('SUMMARY');
  writeText(meeting.summary || '(no summary available)', { size: 11, lineGap: 8 });

  // Action items
  if (meeting.actionItems?.length) {
    writeHeading('ACTION ITEMS');
    meeting.actionItems.forEach((a, i) => {
      writeText(`${i + 1}. ${a.text}${a.owner ? `  —  ${a.owner}` : ''}`, { size: 11, lineGap: 2 });
    });
  }

  // Transcript
  if (meeting.transcript?.length) {
    writeHeading('TRANSCRIPT');
    meeting.transcript.forEach(t => {
      const time = formatTs(t.ts);
      writeText(`[${time}] ${t.speaker}`, { size: 10, bold: true, color: [45, 140, 255] });
      writeText(t.text, { size: 11, lineGap: 4 });
    });
  }

  doc.save(safeFilename(meeting.title, 'pdf'));
}

// ---------- DOCX ----------
async function downloadDocx(meeting: Meeting) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
  const { saveAs } = await import('file-saver');

  const children: any[] = [];

  // Title
  children.push(new Paragraph({
    children: [new TextRun({ text: 'MEETING SUMMARY', size: 18, color: '888888', bold: true })],
  }));
  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: meeting.title, size: 36, bold: true })],
  }));

  const metaParts: string[] = [new Date(meeting.timestamp).toLocaleString()];
  if (meeting.durationMs) metaParts.push(`${Math.round(meeting.durationMs / 60000)} min`);
  if (meeting.zoomMeetingNumber) metaParts.push(`Zoom #${meeting.zoomMeetingNumber}`);
  children.push(new Paragraph({
    children: [new TextRun({ text: metaParts.join('  ·  '), color: '777777', size: 20 })],
  }));

  if (meeting.participants?.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `Participants: ${meeting.participants.join(', ')}`, size: 20, color: '555555' })],
    }));
  }

  // Summary
  children.push(new Paragraph({ text: '', spacing: { before: 200 } }));
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: 'Summary', color: '2D8CFF', bold: true })],
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: meeting.summary || '(no summary available)', size: 22 })],
  }));

  // Action items
  if (meeting.actionItems?.length) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240 },
      children: [new TextRun({ text: 'Action Items', color: '2D8CFF', bold: true })],
    }));
    meeting.actionItems.forEach((a, i) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${i + 1}. ${a.text}`, size: 22 }),
          ...(a.owner ? [new TextRun({ text: `  —  ${a.owner}`, color: '888888', size: 22 })] : []),
        ],
      }));
    });
  }

  // Transcript
  if (meeting.transcript?.length) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240 },
      children: [new TextRun({ text: 'Transcript', color: '2D8CFF', bold: true })],
    }));
    meeting.transcript.forEach(t => {
      children.push(new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: `[${formatTs(t.ts)}] `, color: '888888', size: 18 }),
          new TextRun({ text: t.speaker, bold: true, color: '2D8CFF', size: 20 }),
        ],
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: t.text, size: 22 })],
      }));
    });
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, safeFilename(meeting.title, 'docx'));
}
