"""
sentence_analyzer.py — Meraiah | Lexora Text/NLP Pipeline | Week 2

Upgrades from single-word to full sentence analysis.
New tools used this week:
  - metaphone: converts words to sound codes for proper phonetic matching
  - rapidfuzz: fast fuzzy similarity scoring
  - pyspellchecker: flags words not in the English dictionary

Core output: analyze_sentence(reference, typed) → detailed JSON
"""

from edit_distance import levenshtein_distance
from text_analyzer import analyze_word, REVERSAL_PAIRS, REVERSAL_WORDS
from metaphone import doublemetaphone
from rapidfuzz import fuzz
from spellchecker import SpellChecker

spell = SpellChecker()


# ─────────────────────────────────────────────────────────────────────────────
# METAPHONE — proper phonetic matching
# ─────────────────────────────────────────────────────────────────────────────

def sounds_like(word1: str, word2: str) -> bool:
    """
    Returns True if two words sound the same phonetically,
    even if spelled differently.

    Uses Double Metaphone — converts each word to a phonetic code.
    Examples:
      phone / fone  → both → ('FN', '')     → match ✓
      knight / nite → both → ('NT', '')     → match ✓
      cat / bat     → ('KT','') vs ('PT','') → no match ✓

    This is much more powerful than the pattern list in Week 1
    because it catches phonetic errors we didn't think to list.
    """
    w1 = word1.lower().strip()
    w2 = word2.lower().strip()

    if w1 == w2:
        return False  # Not a phonetic error if identical

    codes1 = doublemetaphone(w1)  # Returns (primary, secondary)
    codes2 = doublemetaphone(w2)

    # Compare all non-empty code combinations
    codes1_set = {c for c in codes1 if c}
    codes2_set = {c for c in codes2 if c}

    return bool(codes1_set & codes2_set)  # Any overlap = sounds alike


def get_phonetic_code(word: str) -> str:
    """Returns the primary metaphone code for a word."""
    primary, secondary = doublemetaphone(word.lower().strip())
    return primary or secondary or word


# ─────────────────────────────────────────────────────────────────────────────
# SPELL CHECK — flags non-dictionary words
# ─────────────────────────────────────────────────────────────────────────────

def get_misspelled(words: list) -> set:
    """
    Returns the set of words from the list that aren't
    in the English dictionary.

    Note: filters out very short words (1-2 chars) to avoid
    false positives on articles like 'a', 'an', 'I'.
    """
    filtered = [w for w in words if len(w) > 2]
    return spell.unknown(filtered)


# ─────────────────────────────────────────────────────────────────────────────
# SENTENCE TOKENIZER
# ─────────────────────────────────────────────────────────────────────────────

def tokenize(sentence: str) -> list:
    """
    Splits a sentence into clean lowercase words.
    Removes punctuation so 'dog.' matches 'dog'.
    """
    import re
    words = re.findall(r"[a-zA-Z']+", sentence.lower())
    return words


# ─────────────────────────────────────────────────────────────────────────────
# WORD ALIGNMENT
# ─────────────────────────────────────────────────────────────────────────────

def align_words(reference_words: list, typed_words: list) -> list:
    """
    Aligns reference and typed word lists for comparison.

    Problem: if a child skips or inserts a word, naive zip()
    misaligns everything after that point.

    Solution: pair each reference word with the closest typed word
    using fuzzy matching. If no close match exists, mark as omitted.

    Returns list of (reference_word, typed_word_or_None) pairs.
    """
    pairs = []
    used = set()

    for ref_word in reference_words:
        best_match = None
        best_score = 0

        for i, typed_word in enumerate(typed_words):
            if i in used:
                continue
            score = fuzz.ratio(ref_word, typed_word)
            if score > best_score:
                best_score = score
                best_match = (i, typed_word)

        # Only accept match if similarity > 40% (avoids total nonsense pairs)
        if best_match and best_score > 40:
            used.add(best_match[0])
            pairs.append((ref_word, best_match[1]))
        else:
            pairs.append((ref_word, None))  # Word was omitted

    return pairs


# ─────────────────────────────────────────────────────────────────────────────
# MAIN SENTENCE ANALYSIS FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def analyze_sentence(reference: str, typed: str) -> dict:
    """
    Core Week 2 deliverable.

    Analyzes a full sentence typed by a child against the reference.

    Args:
        reference: the correct sentence
        typed:     what the child actually typed

    Returns a dict with:
      word_count          — total reference words
      omission_count      — words the child skipped entirely
      reversal_count      — b/d or mirror-word reversals
      phonetic_count      — metaphone-confirmed phonetic errors
      spelling_error_count — other spelling mistakes
      minor_typo_count    — edit distance 1 errors
      correct_count       — correctly typed words
      overall_similarity  — rapidfuzz sentence-level score (0-100)
      misspelled_words    — words flagged by spellchecker
      word_details        — per-word breakdown
      summary             — plain English summary
    """
    ref_words = tokenize(reference)
    typed_words = tokenize(typed)

    # Sentence-level similarity (rapidfuzz)
    overall_similarity = fuzz.ratio(reference.lower(), typed.lower())

    # Align words
    pairs = align_words(ref_words, typed_words)

    # Spell check the typed words
    misspelled = get_misspelled(typed_words)

    # Analyse each word pair
    word_details = []
    counts = {
        'correct': 0,
        'omission': 0,
        'reversal': 0,
        'phonetic': 0,
        'spelling_error': 0,
        'minor_typo': 0,
        'severe_misspelling': 0
    }

    for ref_word, typed_word in pairs:
        if typed_word is None:
            # Word was omitted entirely
            word_details.append({
                'reference': ref_word,
                'typed': '[omitted]',
                'error_type': 'omission',
                'is_reversal': False,
                'is_phonetic': False,
                'edit_distance': None,
                'sounds_like': False
            })
            counts['omission'] += 1
            continue

        # Get base analysis from Week 1
        base = analyze_word(ref_word, typed_word)

        # Upgrade phonetic detection with metaphone
        phonetic_match = sounds_like(ref_word, typed_word)

        # Override error_type if metaphone confirms phonetic
        if not base['correct'] and phonetic_match and not base['is_reversal']:
            error_type = 'phonetic'
            is_phonetic = True
        else:
            error_type = base['error_type']
            is_phonetic = base['is_phonetic'] or phonetic_match

        counts[error_type if error_type in counts else 'spelling_error'] += 1

        word_details.append({
            'reference':     ref_word,
            'typed':         typed_word,
            'error_type':    error_type,
            'is_reversal':   base['is_reversal'],
            'is_phonetic':   is_phonetic,
            'edit_distance': base['edit_distance'],
            'sounds_like':   phonetic_match,
            'flagged_by_spellcheck': typed_word in misspelled
        })

    # Build plain-English summary
    issues = []
    if counts['reversal'] > 0:
        issues.append(f"{counts['reversal']} letter reversal(s)")
    if counts['phonetic'] > 0:
        issues.append(f"{counts['phonetic']} phonetic error(s)")
    if counts['omission'] > 0:
        issues.append(f"{counts['omission']} omitted word(s)")
    if counts['spelling_error'] > 0:
        issues.append(f"{counts['spelling_error']} spelling error(s)")

    summary = (
        f"Child typed {len(typed_words)} of {len(ref_words)} words. "
        + (f"Issues: {', '.join(issues)}." if issues else "No significant errors.")
        + f" Overall similarity: {overall_similarity}%."
    )

    return {
        'word_count':            len(ref_words),
        'typed_word_count':      len(typed_words),
        'omission_count':        counts['omission'],
        'reversal_count':        counts['reversal'],
        'phonetic_count':        counts['phonetic'],
        'spelling_error_count':  counts['spelling_error'],
        'minor_typo_count':      counts['minor_typo'],
        'correct_count':         counts['correct'],
        'overall_similarity':    overall_similarity,
        'misspelled_words':      list(misspelled),
        'word_details':          word_details,
        'summary':               summary
    }


# ─────────────────────────────────────────────────────────────────────────────
# TEST RUNNER
# ─────────────────────────────────────────────────────────────────────────────

TEST_SENTENCES = [
    (
        "The dog sat on the mat",
        "The bog sat on the mat",
        "b/d reversal: dog → bog"
    ),
    (
        "She went to the phone box",
        "She went to the fone box",
        "phonetic: phone → fone"
    ),
    (
        "My friend was at the park",
        "My freind saw at the park",
        "transposition + was/saw reversal"
    ),
    (
        "The beautiful butterfly landed on the flower",
        "The butiful buterfly landed on the flower",
        "multiple spelling errors"
    ),
    (
        "Because it was raining we stayed inside",
        "Becuz it was raning we stayed inside",
        "phonetic + spelling errors"
    ),
]


if __name__ == "__main__":
    import json

    print("=" * 65)
    print("LEXORA — Sentence Analyzer | Meraiah | Week 2 Deliverable")
    print("=" * 65)

    for ref, typed, note in TEST_SENTENCES:
        result = analyze_sentence(ref, typed)
        print(f"\n[{note}]")
        print(f"  Reference : '{ref}'")
        print(f"  Typed     : '{typed}'")
        print(f"  Summary   : {result['summary']}")
        print(f"  Reversals : {result['reversal_count']}  "
              f"Phonetic : {result['phonetic_count']}  "
              f"Omissions : {result['omission_count']}  "
              f"Spelling : {result['spelling_error_count']}")
        print(f"  Similarity: {result['overall_similarity']}%")
        print()

    print("=" * 65)
    print("Week 2 sentence_analyzer.py complete.")
    print("=" * 65)