export const BAND_LABEL: Record<string, string> = {
  few_signals: 'Few signals observed',
  some_signals: 'Some signals — may warrant closer observation',
  multiple_signals: 'Multiple signals — closer observation recommended',
  insufficient_data: 'Not enough completed tasks',
}

export const BAND_SHORT: Record<string, string> = {
  few_signals: 'Few signals',
  some_signals: 'Some signals',
  multiple_signals: 'Multiple signals',
  insufficient_data: 'Incomplete',
}

// Bands are shown in calm, non-alarming colours: teal, sun, coral.
export const BAND_CLASS: Record<string, string> = {
  few_signals: 'bg-teal-100 text-teal-700',
  some_signals: 'bg-sun-100 text-sun-700',
  multiple_signals: 'bg-coral-100 text-coral-500',
  insufficient_data: 'bg-cream-200 text-navy-700',
}

export const LEVEL_LABEL: Record<string, string> = {
  Beginner: 'Beginner',
  'Capital letter': 'Capital letters',
  'Small letter': 'Small letters',
  word: 'Words',
  Sentence: 'Sentences',
}

export const LADDER_LABEL: Record<string, string> = {
  CL: 'Capital letters', SL: 'Small letters', W: 'Words', S: 'Sentences',
  word_dictation: 'Word dictation', sentence_dictation: 'Sentence dictation', passage: 'Passage reading',
}

export const PATTERN_LABEL: Record<string, string> = {
  mirror_letter_reversal: 'Mirror-letter reversal (b/d, p/q)',
  sequence_reversal: 'Whole-word reversal (was/saw)',
  letter_transposition: 'Letters swapped (form/from)',
  letter_omission: 'Letter left out',
  letter_addition: 'Extra letter',
  vowel_confusion: 'Vowel confusion (pen/pin)',
  letter_substitution: 'Letter substitution',
  phonetic_spelling: 'Sound-alike spelling (sed/said)',
  double_letter_dropped: 'Double letter dropped',
  word_omitted: 'Word left out',
  word_added: 'Extra word',
}

export const SKILL_LABEL: Record<string, string> = {
  letter_recognition: 'Letter recognition',
  letter_order_and_orientation: 'Letter order & orientation',
  sound_to_spelling: 'Sounds to spelling',
  complete_spelling: 'Writing every letter',
  sight_words: 'Sight words',
  reading_fluency: 'Reading smoothly',
}

// Chart marks use darker, validated variants of the brand hues (dataviz validator:
// lightness band, chroma floor, CVD separation and 3:1 contrast all pass on white).
export const GROUP_COLOR: Record<string, string> = {
  reading: '#0a9a9d', writing: '#5f4aa8', speech: '#a8760f',
}
export const GROUP_LABEL: Record<string, string> = { reading: 'Reading', writing: 'Writing', speech: 'Speech' }

export const pct = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(digits)}%`

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-IN'
  u.rate = 0.85
  window.speechSynthesis.speak(u)
  return true
}
