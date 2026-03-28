/**
 * Remove common LLM wrappers (fenced blocks, "Here is your resume…") so PDFs start clean.
 */
export function stripAiPreamble(markdown: string): string {
  let s = markdown.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:markdown|md)?\s*\n?/i, '');
    const idx = s.lastIndexOf('```');
    if (idx > 0) s = s.slice(0, idx).trim();
  }
  const lines = s.split('\n');
  const start = lines.findIndex((line) => {
    const t = line.trim();
    if (!t) return false;
    if (/^#{1,6}\s+\S/.test(t)) return true;
    if (/^dear\s+/i.test(t)) return true;
    return false;
  });
  if (start > 0) {
    return lines.slice(start).join('\n').trim();
  }
  return s;
}
