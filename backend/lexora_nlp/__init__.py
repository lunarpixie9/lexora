"""Lexora NLP: deterministic, explainable comparison of expected vs. produced text.

Everything here runs locally with no external API. The public entry point is
`analyze_text(expected, actual)` in `features.py`.
"""
from .alignment import align_chars, align_words, levenshtein
from .features import analyze_text, classify_word_error
from .normalize import normalize_text, tokenize
from .phonetic import phonetic_key, phonetically_similar

__all__ = [
    "align_chars",
    "align_words",
    "analyze_text",
    "classify_word_error",
    "levenshtein",
    "normalize_text",
    "phonetic_key",
    "phonetically_similar",
    "tokenize",
]
