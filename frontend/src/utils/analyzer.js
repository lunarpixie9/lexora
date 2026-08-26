/**
 * Dyslexia Screening Analysis Engine (Client-Side)
 * 
 * Rule-based detection for dyslexia indicators in written text.
 * This runs entirely in the browser and provides real-time feedback.
 */

// Common letter reversals in dyslexia
const REVERSAL_PAIRS = {
  'b': 'd', 'd': 'b',
  'p': 'q', 'q': 'p',
  'm': 'w', 'w': 'm',
  'n': 'u', 'u': 'n',
};

// Common phonetic substitutions
const PHONETIC_PATTERNS = [
  { pattern: /\bf(\w*)/gi, expected: 'ph', desc: 'f→ph' },
  { pattern: /\bfone\b/gi, correct: 'phone', desc: 'fone→phone' },
  { pattern: /\bfoto\b/gi, correct: 'photo', desc: 'foto→photo' },
  { pattern: /\bskool\b/gi, correct: 'school', desc: 'skool→school' },
  { pattern: /\bnite\b/gi, correct: 'night', desc: 'nite→night' },
  { pattern: /\blite\b/gi, correct: 'light', desc: 'lite→light' },
  { pattern: /\brite\b/gi, correct: 'right', desc: 'rite→right' },
  { pattern: /\bwuz\b/gi, correct: 'was', desc: 'wuz→was' },
  { pattern: /\bsed\b/gi, correct: 'said', desc: 'sed→said' },
  { pattern: /\bkum\b/gi, correct: 'come', desc: 'kum→come' },
  { pattern: /\bshun\b/gi, correct: 'tion', desc: 'shun→tion' },
  { pattern: /\bthay\b/gi, correct: 'they', desc: 'thay→they' },
  { pattern: /\bther\b/gi, correct: 'there', desc: 'ther→there' },
  { pattern: /\bwent\b/gi, correct: 'went', desc: 'correct' },
];

// Known transposition words (the word itself is a transposition of a common word)
const TRANSPOSITIONS = {
  'saw': { of: 'was', note: 'saw↔was transposition' },
  'form': { of: 'from', note: 'form↔from transposition' },
  'on': { of: 'no', note: 'on↔no transposition' },
  'left': { of: 'felt', note: 'left↔felt transposition' },
  'pot': { of: 'top', note: 'pot↔top transposition' },
  'tar': { of: 'rat', note: 'tar↔rat transposition' },
  'god': { of: 'dog', note: 'god↔dog transposition' },
};

/**
 * Analyze a text sample for dyslexia indicators
 * @param {string} text - The child's written text
 * @returns {object} Analysis results
 */
export function analyzeText(text) {
  if (!text || text.trim().length === 0) {
    return { score: 0, indicators: [], flaggedWords: [], summary: 'No text to analyze.' };
  }

  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;
  const indicators = [];
  const flaggedWords = [];

  // 1. Check for letter reversals
  let reversalCount = 0;
  const reversalChars = new Set(Object.keys(REVERSAL_PAIRS));
  words.forEach(word => {
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (reversalChars.has(char)) {
        // Check if this word exists in a basic dictionary context
        // For MVP, we flag words containing b/d/p/q and check frequency
        reversalCount++;
      }
    }
  });

  // 2. Check for phonetic spelling errors
  let phoneticErrorCount = 0;
  const phoneticErrors = [];
  PHONETIC_PATTERNS.forEach(({ pattern, correct, desc }) => {
    if (correct && pattern.test(text)) {
      phoneticErrorCount++;
      phoneticErrors.push(desc);
      const match = text.match(pattern);
      if (match) flaggedWords.push(`${match[0]} (→${correct})`);
    }
  });

  // 3. Check for transpositions
  let transpositionCount = 0;
  words.forEach(word => {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (TRANSPOSITIONS[cleaned]) {
      transpositionCount++;
      flaggedWords.push(`${cleaned} (→${TRANSPOSITIONS[cleaned].of}?)`);
    }
  });

  // 4. Check for repeated letters (common in dyslexia - e.g., "goood" for "good")
  let repeatCount = 0;
  words.forEach(word => {
    if (/(.)\1{2,}/g.test(word)) {
      repeatCount++;
      flaggedWords.push(`${word} (repeated letters)`);
    }
  });

  // 5. Check spelling consistency (same word spelled differently)
  const wordSpellings = {};
  let inconsistencyCount = 0;
  words.forEach(word => {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned.length < 3) return;
    
    // Simple edit distance check against already-seen words
    Object.keys(wordSpellings).forEach(seen => {
      if (seen !== cleaned && levenshtein(seen, cleaned) === 1 && seen.length === cleaned.length) {
        inconsistencyCount++;
      }
    });
    wordSpellings[cleaned] = (wordSpellings[cleaned] || 0) + 1;
  });

  // Build indicator scores
  const reversalScore = Math.max(0, 100 - (reversalCount > 10 ? 40 : reversalCount * 4));
  const phoneticScore = Math.max(0, 100 - phoneticErrorCount * 20);
  const transpositionScore = Math.max(0, 100 - transpositionCount * 25);
  const consistencyScore = Math.max(0, 100 - inconsistencyCount * 15);
  const repeatScore = Math.max(0, 100 - repeatCount * 20);

  indicators.push({ name: 'Phonetic Accuracy', score: phoneticScore, icon: '🔤' });
  indicators.push({ name: 'Letter Reversals (b/d, p/q)', score: reversalScore, icon: '🔁' });
  indicators.push({ name: 'Transpositions', score: transpositionScore, icon: '🔀' });
  indicators.push({ name: 'Spelling Consistency', score: consistencyScore, icon: '📝' });
  indicators.push({ name: 'Letter Repetition', score: repeatScore, icon: '🔂' });

  // Overall score (weighted average)
  const overallScore = Math.round(
    indicators.reduce((sum, ind) => sum + ind.score, 0) / indicators.length
  );

  const riskLevel = overallScore >= 80 ? 'Low' : overallScore >= 55 ? 'Moderate' : 'High';

  let summary = '';
  if (riskLevel === 'Low') {
    summary = 'Great writing! No significant indicators of reading difficulty were detected.';
  } else if (riskLevel === 'Moderate') {
    summary = 'Some patterns worth monitoring were detected. Consider repeating the screening in a few weeks.';
  } else {
    summary = 'Multiple indicators of potential reading difficulty were detected. We recommend consulting a professional.';
  }

  return {
    overallScore,
    riskLevel,
    indicators,
    flaggedWords: [...new Set(flaggedWords)],
    totalWords,
    phoneticErrors,
    summary,
  };
}

/**
 * Analyze read-aloud performance by comparing transcript to expected text
 * @param {string} transcript - What the speech recognition heard
 * @param {string} expected - The passage the child was supposed to read
 * @param {number} durationSeconds - How long it took
 * @returns {object} Analysis results
 */
export function analyzeReadAloud(transcript, expected, durationSeconds) {
  if (!transcript || transcript.trim().length === 0) {
    return { score: 0, indicators: [], summary: 'No speech detected.', wpm: 0, accuracy: 0 };
  }

  const expectedWords = expected.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  const spokenWords = transcript.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  const indicators = [];

  // 1. Words per minute
  const wpm = Math.round((spokenWords.length / durationSeconds) * 60);
  // Normal WPM for kids: age 6-7: ~60-90, age 8-9: ~90-120, age 10+: ~120-150
  const wpmScore = wpm >= 60 ? Math.min(100, Math.round((wpm / 90) * 100)) : Math.max(20, Math.round((wpm / 60) * 80));

  // 2. Word accuracy (how many expected words were actually spoken)
  let matchCount = 0;
  const mispronounced = [];
  
  expectedWords.forEach((word, i) => {
    // Find closest match in spoken words
    const found = spokenWords.some(sw => sw === word || levenshtein(sw, word) <= 1);
    if (found) {
      matchCount++;
    } else {
      mispronounced.push(word);
    }
  });

  const accuracyPercent = Math.round((matchCount / expectedWords.length) * 100);
  const accuracyScore = accuracyPercent;

  // 3. Word coverage (did they read the whole passage?)
  const coveragePercent = Math.min(100, Math.round((spokenWords.length / expectedWords.length) * 100));

  // 4. Estimate hesitations (very rough: big gaps in word count vs time)
  const expectedTime = expectedWords.length / 1.5; // ~1.5 words per second for kids
  const hesitationFactor = durationSeconds / expectedTime;
  const fluencyScore = hesitationFactor > 2 ? 40 : hesitationFactor > 1.5 ? 60 : hesitationFactor > 1.2 ? 75 : 90;

  indicators.push({ name: 'Reading Speed (WPM)', score: wpmScore, icon: '⚡', detail: `${wpm} words/min` });
  indicators.push({ name: 'Word Accuracy', score: accuracyScore, icon: '🎯', detail: `${accuracyPercent}%` });
  indicators.push({ name: 'Passage Coverage', score: coveragePercent, icon: '📖', detail: `${coveragePercent}%` });
  indicators.push({ name: 'Fluency / Hesitations', score: fluencyScore, icon: '🌊', detail: hesitationFactor > 1.5 ? 'Frequent pauses' : 'Good flow' });

  const overallScore = Math.round(indicators.reduce((sum, ind) => sum + ind.score, 0) / indicators.length);
  const riskLevel = overallScore >= 75 ? 'Low' : overallScore >= 50 ? 'Moderate' : 'High';

  let summary = '';
  if (riskLevel === 'Low') {
    summary = 'Great reading! Fluency and accuracy look strong.';
  } else if (riskLevel === 'Moderate') {
    summary = 'Some hesitation and accuracy concerns were noted. Consider practicing more read-aloud sessions.';
  } else {
    summary = 'Significant reading difficulty indicators detected. We recommend professional evaluation.';
  }

  return {
    overallScore,
    riskLevel,
    indicators,
    wpm,
    accuracy: accuracyPercent,
    mispronounced: mispronounced.slice(0, 10),
    summary,
  };
}

// Simple Levenshtein distance
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
      );
    }
  }
  return dp[m][n];
}
