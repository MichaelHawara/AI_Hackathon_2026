import { downloadMarkdownAsPdf } from './pdfExport';

/** Download stored document content as a PDF (Firestore keeps markdown; exports are PDF for applications). */
export function downloadUserContentAsPdf(
  content: string,
  docType: string,
  filenameBase: string
): void {
  const kind: 'resume' | 'cover-letter' = docType === 'cover-letter' ? 'cover-letter' : 'resume';
  downloadMarkdownAsPdf(content, filenameBase, kind);
}

export function downloadAsMarkdownFile(content: string, filenameBase: string): void {
  const safe = filenameBase.replace(/[^\w\s\-]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'document';
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(file);
  element.href = url;
  element.download = `${safe}.md`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}
