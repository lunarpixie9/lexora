"""Feature extraction: compare expected text with what the child produced.

`analyze_text` works for typed writing (dictation answers) and for speech
transcripts alike; the caller decides which features are meaningful for the
task type (e.g. words-per-minute is not computed here at all).

All counts are *observed error patterns*, not diagnostic categories.
"""
from __future__ import annotations

from collections import Counter

from .alignment import align_chars, align_words, levenshtein
from .normalize import normalize_text, tokenize
from .phonetic import phonetically_similar

# Letters that are mirror images / rotations of each other; a substitution
# within one of these pairs is a classic *observed* reversal pattern.
MIRROR_PAIRS = {frozenset("bd"), frozenset("pq"), frozenset("mw"), frozenset("nu")}
VOWELS = set("aeiou")


def classify_word_error(expected: str, actual: str) -> dict:
    """Describe how `actual` differs from `expected` (both single words)."""
    expected, actual = expected.lower(), actual.lower()
    ops = align_chars(expected, actual)
    counts = Counter(op for op, _, _ in ops if op != "equal")
    patterns: list[str] = []

    mirror = sum(
        1 for op, e, a in ops if op == "substitute" and frozenset((e, a)) in MIRROR_PAIRS
    )
    if mirror:
        patterns.append("mirror_letter_reversal")

    sequence_reversal = len(expected) > 1 and actual == expected[::-1]
    if sequence_reversal:
        patterns.append("sequence_reversal")  # was -> saw

    transposition = False
    if (
        not sequence_reversal
        and len(expected) == len(actual)
        and sorted(expected) == sorted(actual)
        and levenshtein(expected, actual) == 2
    ):
        # same letters, two positions differ -> adjacent (or near) letters swapped
        transposition = True
        patterns.append("letter_transposition")  # form -> from

    if counts["delete"] and not counts["insert"] and not counts["substitute"]:
        patterns.append("letter_omission")  # runing -> running
    if counts["insert"] and not counts["delete"] and not counts["substitute"]:
        patterns.append("letter_addition")
    if counts["substitute"] and not transposition and not sequence_reversal:
        vowel_swaps = sum(
            1 for op, e, a in ops if op == "substitute" and e in VOWELS and a in VOWELS
        )
        if vowel_swaps and vowel_swaps == counts["substitute"]:
            patterns.append("vowel_confusion")  # pen -> pin
        elif not mirror:
            patterns.append("letter_substitution")

    doubled = any(
        op == "delete" and i > 0 and ops[i - 1][1] == e for i, (op, e, _) in enumerate(ops)
    )
    if doubled:
        patterns.append("double_letter_dropped")

    phonetic = phonetically_similar(expected, actual) and expected != actual
    if phonetic:
        patterns.append("phonetic_spelling")  # sed -> said

    return {
        "expected": expected,
        "actual": actual,
        "edit_distance": levenshtein(expected, actual),
        "letter_substitutions": counts["substitute"],
        "letter_omissions": counts["delete"],
        "letter_additions": counts["insert"],
        "is_reversal": bool(mirror or sequence_reversal),
        "is_transposition": transposition,
        "phonetic_plausible": phonetic,
        "patterns": patterns,
    }


def analyze_text(expected: str, actual: str) -> dict:
    """Compare expected text with produced text and return explainable features."""
    exp_tokens, act_tokens = tokenize(expected), tokenize(actual)
    ops = align_words(exp_tokens, act_tokens)

    correct = word_subs = word_omissions = word_additions = 0
    word_errors: list[dict] = []
    for op, e, a in ops:
        if op == "equal":
            correct += 1
        elif op == "substitute":
            word_subs += 1
            word_errors.append(classify_word_error(e, a))
        elif op == "delete":
            word_omissions += 1
            word_errors.append({"expected": e, "actual": None, "patterns": ["word_omitted"]})
        else:
            word_additions += 1
            word_errors.append({"expected": None, "actual": a, "patterns": ["word_added"]})

    total = len(exp_tokens)
    errors = word_subs + word_omissions + word_additions
    misspelt = [w for w in word_errors if w.get("actual") and w.get("expected")]

    repetitions = sum(1 for i in range(1, len(act_tokens)) if act_tokens[i] == act_tokens[i - 1])
    pattern_counts = Counter(p for w in word_errors for p in w["patterns"])

    exp_norm, act_norm = normalize_text(expected), normalize_text(actual)
    char_distance = levenshtein(exp_norm, act_norm)

    return {
        "expected_normalized": exp_norm,
        "actual_normalized": act_norm,
        "total_words": total,
        "produced_words": len(act_tokens),
        "correct_words": correct,
        "accuracy": round(correct / total, 4) if total else 0.0,
        "word_error_rate": round(errors / total, 4) if total else (1.0 if act_tokens else 0.0),
        "spelling_error_count": word_subs,
        "omission_count": word_omissions,
        "addition_count": word_additions,
        "substitution_count": word_subs,
        "repetition_count": repetitions,
        "transposition_count": sum(1 for w in misspelt if w.get("is_transposition")),
        "reversal_count": sum(1 for w in misspelt if w.get("is_reversal")),
        "phonetic_error_count": sum(1 for w in misspelt if w.get("phonetic_plausible")),
        "letter_omission_count": sum(w.get("letter_omissions", 0) for w in misspelt),
        "letter_addition_count": sum(w.get("letter_additions", 0) for w in misspelt),
        "letter_substitution_count": sum(w.get("letter_substitutions", 0) for w in misspelt),
        "vowel_confusion_count": pattern_counts.get("vowel_confusion", 0),
        "edit_distance": char_distance,
        "character_error_rate": round(char_distance / len(exp_norm), 4) if exp_norm else 0.0,
        "pattern_counts": dict(pattern_counts),
        "word_errors": word_errors,
    }
