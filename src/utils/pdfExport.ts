import { jsPDF } from 'jspdf';
import { stripAiPreamble } from './aiOutput';

function linePlain(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function writeLines(
  doc: jsPDF,
  parts: string[],
  margin: number,
  startY: number,
  lineHeight: number,
  pageH: number,
  marginBottom: number
): number {
  let y = startY;
  for (const part of parts) {
    if (y + lineHeight > pageH - marginBottom) {
      doc.addPage();
      y = marginBottom;
    }
    doc.text(part, margin, y);
    y += lineHeight;
  }
  return y;
}

export function downloadMarkdownAsPdf(
  markdown: string,
  filenameBase: string,
  kind: 'resume' | 'cover-letter' = 'resume'
): void {
  const cleaned = stripAiPreamble(markdown);
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 54;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  const lines = cleaned.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      y += kind === 'cover-letter' ? 10 : 8;
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      continue;
    }

    if (line.startsWith('# ')) {
      if (y > pageH - margin - 48) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      const t = linePlain(line.slice(2));
      const wrapped = doc.splitTextToSize(t, maxW);
      y = writeLines(doc, wrapped, margin, y, 22, pageH, margin);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      y += 6;
      continue;
    }
    if (line.startsWith('## ')) {
      if (y > pageH - margin - 40) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const t = linePlain(line.slice(3));
      const wrapped = doc.splitTextToSize(t, maxW);
      y = writeLines(doc, wrapped, margin, y, 16, pageH, margin);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      y += 8;
      continue;
    }
    if (line.startsWith('### ')) {
      if (y > pageH - margin - 32) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const t = linePlain(line.slice(4));
      const wrapped = doc.splitTextToSize(t, maxW);
      y = writeLines(doc, wrapped, margin, y, 14, pageH, margin);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      y += 4;
      continue;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(kind === 'cover-letter' ? 11 : 10);
    const plain = linePlain(line.startsWith('- ') || line.startsWith('* ') ? line.slice(2) : line);
    const wrapped = doc.splitTextToSize(plain, maxW);
    const lh = kind === 'cover-letter' ? 15 : 13;
    y = writeLines(doc, wrapped, margin, y, lh, pageH, margin);
  }

  if (kind === 'cover-letter') {
    let pad = 0;
    while (y < pageH - margin - 32 && pad < 45) {
      if (y + 14 > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      y += 14;
      pad++;
    }
  }

  const safe = filenameBase.replace(/[^\w\s\-]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'document';
  doc.save(`${safe}.pdf`);
}
