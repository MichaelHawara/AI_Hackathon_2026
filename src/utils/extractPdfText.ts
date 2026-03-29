import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let workerConfigured = false;

function ensureWorker(): void {
  if (workerConfigured) return;
  GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
  workerConfigured = true;
}

/** Extract plain text from a PDF file in the browser (used for uploads). */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  ensureWorker();
  const data = await file.arrayBuffer();
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const line = textContent.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .join(' ');
    parts.push(line);
  }
  return parts.join('\n').replace(/\s+\n/g, '\n').trim();
}
