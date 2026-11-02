/** Plain text from the API split into paragraphs at blank lines (render each as text, never as HTML). */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** A paragraph starting "Who it is for:" gets that phrase in bold, as the prototype shows it. */
export function leadIn(paragraph: string): [lead: string | null, rest: string] {
  const m = /^([^:.\n]{3,32}:)\s*(.*)$/s.exec(paragraph)
  return m ? [m[1], m[2]] : [null, paragraph]
}

/** Splits `text` around the first case-insensitive match of `query`, for <mark>. */
export function highlightParts(text: string, query: string): [before: string, match: string, after: string] | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return null
  return [text.slice(0, i), text.slice(i, i + q.length), text.slice(i + q.length)]
}
