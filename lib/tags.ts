/**
 * Tags / Labels system for KasDesk transactions.
 * Tags are stored seamlessly within the transaction note/title as #tag.
 */

export const POPULAR_TAGS = [
  '#Liburan',
  '#Kondangan',
  '#Proyek',
  '#Keluarga',
  '#Rutin',
  '#MakanLuar',
  '#Pendidikan',
] as const

/**
 * Extract all unique #tags from a given string (note or title).
 * Handles unicode letters and numbers.
 */
export function extractTags(text?: string | null): string[] {
  if (!text || typeof text !== 'string') return []
  const matches = text.match(/#([\p{L}\p{N}_-]+)/gu)
  if (!matches) return []
  // Deduplicate and normalize case
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of matches) {
    const clean = raw.trim()
    const lower = clean.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      result.push(clean)
    }
  }
  return result
}

/**
 * Append or toggle a tag in a note string.
 */
export function toggleTagInNote(currentNote: string, tag: string): string {
  const normalizedTag = tag.startsWith('#') ? tag.trim() : `#${tag.trim()}`
  const escaped = normalizedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i')

  if (regex.test(currentNote)) {
    // Remove the tag
    return currentNote
      .replace(new RegExp(`${escaped}`, 'ig'), '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  } else {
    // Append the tag
    const trimmed = currentNote.trim()
    return trimmed ? `${trimmed} ${normalizedTag}` : normalizedTag
  }
}
