export type Token = { type: 'word'; text: string } | { type: 'break' }

/**
 * Parse a script into an ordered array of word tokens, inserting a `break`
 * token at every newline so original line structure is preserved on render.
 */
export function parseTokens(text: string): Token[] {
  const tokens: Token[] = []
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const words = line.split(/\s+/).filter(Boolean)
    words.forEach((w) => tokens.push({ type: 'word', text: w }))
    if (i < lines.length - 1) tokens.push({ type: 'break' })
  })
  return tokens
}

/** Index positions of just the word tokens (used to drive the timer). */
export function wordTokenIndices(tokens: Token[]): number[] {
  const indices: number[] = []
  tokens.forEach((t, i) => {
    if (t.type === 'word') indices.push(i)
  })
  return indices
}

export interface ParsedLine {
  text: string
  wordCount: number
}

/**
 * Split a flat list of words into balanced chunks of at most `max` words,
 * distributing as evenly as possible so we avoid leftover 1-word lines.
 * e.g. 7 words -> [4,3], 6 -> [3,3], 5 -> [3,2].
 */
function balancedChunks(words: string[], max: number): string[][] {
  const n = words.length
  if (n <= max) return [words]
  const numChunks = Math.ceil(n / max)
  const base = Math.floor(n / numChunks)
  let remainder = n - base * numChunks
  const chunks: string[][] = []
  let i = 0
  for (let c = 0; c < numChunks; c++) {
    const size = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--
    chunks.push(words.slice(i, i + size))
    i += size
  }
  return chunks
}

/**
 * Re-chunk the script into lines of ~3-4 words each (regardless of the
 * original line wrapping), while still breaking at paragraph boundaries so
 * blank lines stay as visual spacers.
 */
export function parseLines(text: string, max = 4): ParsedLine[] {
  const result: ParsedLine[] = []
  text.split('\n').forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      result.push({ text: '', wordCount: 0 })
      return
    }
    balancedChunks(words, max).forEach((chunk) =>
      result.push({ text: chunk.join(' '), wordCount: chunk.length }),
    )
  })
  return result
}

// Common function words we tend to skim past when speaking.
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'and', 'or',
  'but', 'as', 'is', 'it', 'so', 'if', 'we', 'i', 'he', 'she', 'be', 'do',
  'my', 'me', 'up', 'us', 'no', 'go',
])

/** Rough syllable estimate — tracks spoken length far better than char count. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 1
  if (w.length <= 3) return 1
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g)
  return Math.max(groups ? groups.length : 1, 1)
}

const sentenceEnd = (t: string) => /[.!?]["')\]]*$/.test(t)

/**
 * Per-word display time modelled on natural speech: time is spent per
 * *syllable* (not per character), function words clip by faster, and
 * punctuation adds an absolute pause (a real full stop ~0.5s, a comma ~0.2s)
 * rather than a tiny multiplier — so the read breathes instead of ticking.
 */
export function wordDurationMs(
  text: string,
  wpm: number,
  prevText?: string,
): number {
  const perWord = 60000 / wpm
  const perSyllable = perWord / 1.4 // avg English word ≈ 1.4 syllables
  let dur = countSyllables(text) * perSyllable

  const bare = text.toLowerCase().replace(/[^a-z]/g, '')
  if (FUNCTION_WORDS.has(bare)) dur *= 0.8

  // Pauses are mostly fixed; they compress only mildly as tempo rises.
  const tempo = Math.min(Math.max(150 / wpm, 0.7), 1.3)
  if (/(\.\.\.|…)["')\]]*$/.test(text)) dur += 420 * tempo
  else if (sentenceEnd(text)) dur += 480 * tempo
  else if (/[;:]["')\]]*$/.test(text)) dur += 300 * tempo
  else if (/[,]["')\]]*$/.test(text)) dur += 220 * tempo
  else if (/[—–-]$/.test(text)) dur += 200 * tempo

  // Slight lead-in on the first word of a new sentence.
  if (prevText && sentenceEnd(prevText)) dur += 90 * tempo

  // Humanize so it never sounds like a metronome.
  dur *= 0.94 + Math.random() * 0.12

  return Math.max(dur, perWord * 0.35)
}

/**
 * Per-line display time = the sum of its words' natural durations. Because
 * the line-ending word carries its own full-stop / comma pause, lines pause
 * at sentence boundaries on their own. Blank lines get a short beat.
 */
export function lineDurationMs(text: string, wpm: number): number {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 400
  return words.reduce(
    (sum, w, i) => sum + wordDurationMs(w, wpm, words[i - 1]),
    0,
  )
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/** Estimated read time, formatted as "m:ss". */
export function formatReadTime(words: number, wpm: number): string {
  if (wpm <= 0 || words <= 0) return '0:00'
  const totalSeconds = Math.round((words / wpm) * 60)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
