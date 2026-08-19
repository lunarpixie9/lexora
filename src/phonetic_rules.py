"""
phonetic_rules.py

Rule-based detectors for dyslexia-associated spelling error patterns.
This is the explainable "first pass" model discussed in the roadmap —
no training data required, works on any (correct_word, misspelling) pair.

Error categories detected:
  - letter_reversal      : b/d, p/q swaps (classic dyslexia marker)
  - transposition         : adjacent letters swapped (was -> saw)
  - phonetic_substitution : letter(s) swapped for something that sounds
                             the same (fone -> phone)
  - omission / insertion   : a letter dropped or added
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from rapidfuzz.distance import Levenshtein
from metaphone import doublemetaphone

# --- Confusion tables -------------------------------------------------

# Visually similar letter pairs commonly reversed by dyslexic writers/typists.
REVERSAL_PAIRS = {
    ("b", "d"), ("d", "b"),
    ("p", "q"), ("q", "p"),
    ("n", "u"), ("u", "n"),
    ("m", "w"), ("w", "m"),
}

# Common phonetic substitutions (sound-alike spelling patterns).
# Each tuple is (pattern_in_correct, pattern_in_misspelling).
PHONETIC_SUBSTITUTIONS = [
    ("ph", "f"),
    ("c", "k"),
    ("ck", "k"),
    ("ei", "ie"),
    ("ie", "ei"),
    ("tion", "shun"),
    ("qu", "kw"),
    ("wh", "w"),
    ("gh", ""),
    ("x", "ks"),
]


@dataclass
class ErrorAnalysis:
    correct: str
    misspelling: str
    edit_distance: int
    has_reversal: bool
    has_transposition: bool
    has_phonetic_substitution: bool
    phonetic_match: bool          # sounds the same despite being spelled differently
    length_delta: int             # + insertion-leaning, - omission-leaning
    primary_error_type: str = field(default="other")

    def as_feature_dict(self) -> dict:
        """Flat dict — this is what feeds the XGBoost risk classifier later."""
        return {
            "edit_distance": self.edit_distance,
            "has_reversal": int(self.has_reversal),
            "has_transposition": int(self.has_transposition),
            "has_phonetic_substitution": int(self.has_phonetic_substitution),
            "phonetic_match": int(self.phonetic_match),
            "length_delta": self.length_delta,
            "primary_error_type": self.primary_error_type,
        }


def _has_reversal(correct: str, misspelling: str) -> bool:
    """Check if a b/d/p/q-style visually-similar letter swap explains the diff."""
    if len(correct) != len(misspelling):
        return False
    diffs = [(a, b) for a, b in zip(correct, misspelling) if a != b]
    if not diffs:
        return False
    return all((a, b) in REVERSAL_PAIRS for a, b in diffs)


def _has_transposition(correct: str, misspelling: str) -> bool:
    """
    Check if misspelling = correct with exactly two letters swapped.
    Covers both adjacent swaps (form -> from) and the classic dyslexia
    example of swapping the first/last letters of a short word (was -> saw).
    """
    if len(correct) != len(misspelling):
        return False
    diff_positions = [i for i in range(len(correct)) if correct[i] != misspelling[i]]
    if len(diff_positions) != 2:
        return False
    i, j = diff_positions
    return correct[i] == misspelling[j] and correct[j] == misspelling[i]


def _has_phonetic_substitution(correct: str, misspelling: str) -> bool:
    c, m = correct.lower(), misspelling.lower()
    for pattern, replacement in PHONETIC_SUBSTITUTIONS:
        if pattern in c and c.replace(pattern, replacement, 1) == m:
            return True
        if replacement and replacement in m and m.replace(replacement, pattern, 1) == c:
            return True
    return False


def _phonetic_match(correct: str, misspelling: str) -> bool:
    """True if the two words share a double-metaphone code (i.e. 'sound' the same)."""
    c_codes = doublemetaphone(correct)
    m_codes = doublemetaphone(misspelling)
    return bool(set(filter(None, c_codes)) & set(filter(None, m_codes)))


def analyze_error(correct: str, misspelling: str) -> ErrorAnalysis:
    """Main entry point: compare a correct word to a misspelling and classify it."""
    correct, misspelling = correct.strip().lower(), misspelling.strip().lower()

    edit_dist = Levenshtein.distance(correct, misspelling)
    reversal = _has_reversal(correct, misspelling)
    transposition = _has_transposition(correct, misspelling)
    phon_sub = _has_phonetic_substitution(correct, misspelling)
    phon_match = _phonetic_match(correct, misspelling)
    length_delta = len(misspelling) - len(correct)

    # Priority order matters for explainability — most specific pattern wins.
    if reversal:
        primary = "letter_reversal"
    elif transposition:
        primary = "transposition"
    elif phon_sub or phon_match:
        primary = "phonetic_substitution"
    elif length_delta < 0:
        primary = "omission"
    elif length_delta > 0:
        primary = "insertion"
    else:
        primary = "other"

    return ErrorAnalysis(
        correct=correct,
        misspelling=misspelling,
        edit_distance=edit_dist,
        has_reversal=reversal,
        has_transposition=transposition,
        has_phonetic_substitution=phon_sub,
        phonetic_match=phon_match,
        length_delta=length_delta,
        primary_error_type=primary,
    )


if __name__ == "__main__":
    # Quick smoke test with a few hand-picked examples covering each category.
    samples = [
        ("bad", "dad"),        # reversal (b/d)
        ("was", "saw"),        # transposition
        ("phone", "fone"),     # phonetic substitution
        ("necessary", "necesary"),  # omission
        ("running", "runnning"),    # insertion
    ]
    for correct, misspelling in samples:
        result = analyze_error(correct, misspelling)
        print(f"{correct!r:>12} -> {misspelling!r:<12} | {result.primary_error_type:<22} | "
              f"edit_dist={result.edit_distance}")