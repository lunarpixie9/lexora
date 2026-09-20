"""Composite screening indicator.

The indicator is a weighted average of *observed literacy signals*, each scaled
to 0-1. Because it is additive, every signal's contribution (weight x value) is
exact and can be shown to the teacher without approximation. Signals whose task
was not completed are left out and the remaining weights are renormalised.

This is a prototype screening aid. Bands describe how many observable signals
were present - they are not probabilities of dyslexia and not a diagnosis.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from .aser_features import LEVEL_DISPLAY

INDICATOR_VERSION = "lexora-indicator-1.0"

BANDS = [
    (0.25, "few_signals", "Few literacy signals observed"),
    (0.50, "some_signals", "Some literacy signals observed - may warrant closer observation"),
    (1.01, "multiple_signals", "Multiple literacy signals observed - closer observation recommended"),
]


@dataclass
class Signal:
    name: str
    label: str
    group: str
    weight: float
    value: float | None  # None = task not available
    raw: str
    note: str = ""


def _clamp(x: float) -> float:
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return 0.0
    return max(0.0, min(1.0, float(x)))


def build_signals(reading: dict | None, writing: dict | None, speech: dict | None) -> list[Signal]:
    """reading: output of reading summary (accuracies + level gap);
    writing: aggregated analyze_text features over dictation tasks;
    speech: passage features (word_error_rate, wpm, wpm_reference, long_pauses_per_10_words)."""
    sig: list[Signal] = []

    # --- Reading ladder (ASER-style, primary real-data anchor) ---
    if reading:
        gap = reading.get("gap_levels", 0)
        sig.append(Signal(
            "reading_level_gap", "Reading level vs. class peers", "reading", 0.25,
            _clamp({0: 0.0, 1: 0.5}.get(max(gap, 0), 1.0)),
            f"{LEVEL_DISPLAY.get(reading.get('level'), reading.get('level'))} vs. typical "
            f"{LEVEL_DISPLAY.get(reading.get('expected_level_for_class'), '')}",
            "Estimated from ASER-trained model; class norms from real ASER data",
        ))
        letter_accs = [reading.get("accuracy_CL"), reading.get("accuracy_SL")]
        letter_accs = [a for a in letter_accs if a is not None and not math.isnan(a)]
        if letter_accs:
            acc = sum(letter_accs) / len(letter_accs)
            sig.append(Signal("letter_reading", "Letter naming errors", "reading", 0.10,
                              _clamp(1 - acc), f"{acc:.0%} of letters read correctly"))
        w_acc = reading.get("accuracy_W")
        if w_acc is not None and not math.isnan(w_acc):
            sig.append(Signal("word_reading", "Word reading errors", "reading", 0.10,
                              _clamp(1 - w_acc), f"{w_acc:.0%} of words read correctly"))
        s_acc = reading.get("accuracy_S")
        if s_acc is not None and not math.isnan(s_acc):
            sig.append(Signal("sentence_reading", "Sentence reading errors", "reading", 0.05,
                              _clamp(1 - s_acc), f"{s_acc:.0%} of sentences read correctly"))

    # --- Writing / spelling (validated on Birkbeck + Holbrook) ---
    if writing and writing.get("total_words"):
        n = writing["total_words"]
        sig.append(Signal("spelling_errors", "Spelling error rate", "writing", 0.15,
                          _clamp(writing.get("word_error_rate", 0)),
                          f"{writing.get('spelling_error_count', 0) + writing.get('omission_count', 0)} of {n} words"))
        rev = writing.get("reversal_count", 0) + writing.get("transposition_count", 0)
        sig.append(Signal("reversals", "Letter reversals / transpositions", "writing", 0.10,
                          _clamp(rev / n * 4), f"{rev} in {n} words",
                          "b/d, p/q, m/w, n/u swaps and letter-order swaps such as was/saw"))
        sig.append(Signal("phonetic_spelling", "Phonetic (sound-alike) spellings", "writing", 0.05,
                          _clamp(writing.get("phonetic_error_count", 0) / n * 2),
                          f"{writing.get('phonetic_error_count', 0)} in {n} words"))
        om = writing.get("letter_omission_count", 0)
        sig.append(Signal("letter_omissions", "Letters left out", "writing", 0.05,
                          _clamp(om / n * 2), f"{om} letters omitted"))

    # --- Speech / oral passage reading ---
    if speech and speech.get("expected_words"):
        sig.append(Signal("passage_mismatch", "Passage reading mismatch", "speech", 0.10,
                          _clamp(speech.get("word_error_rate", 0)),
                          f"{speech.get('word_error_rate', 0):.0%} word error rate",
                          f"Transcribed by {speech.get('engine', 'unknown')}"))
        wpm, ref = speech.get("words_per_minute"), speech.get("wpm_reference") or 60.0
        if wpm is not None:
            sig.append(Signal("reading_rate", "Reading rate below class reference", "speech", 0.05,
                              _clamp(1 - wpm / ref), f"{wpm:.0f} wpm vs. {ref:.0f} wpm reference",
                              "Reference: median rate of correctly read ASER sentences for this class"))
        pauses = speech.get("long_pauses_per_10_words")
        if pauses is not None:
            sig.append(Signal("pauses", "Long pauses while reading", "speech", 0.05,
                              _clamp(pauses / 3), f"{pauses:.1f} pauses >0.5 s per 10 words"))
    return sig


def compute_indicator(reading: dict | None, writing: dict | None, speech: dict | None) -> dict:
    signals = [s for s in build_signals(reading, writing, speech) if s.value is not None]
    total_weight = sum(s.weight for s in signals)
    if not signals or total_weight == 0:
        return {"score": 0.0, "band": "insufficient_data", "band_label": "Not enough completed tasks",
                "signals": [], "version": INDICATOR_VERSION}
    score = sum(s.weight * s.value for s in signals) / total_weight
    band, band_label = next((b, lab) for cut, b, lab in BANDS if score < cut)
    rows = []
    for s in signals:
        share = s.weight / total_weight
        rows.append({
            "name": s.name, "label": s.label, "group": s.group,
            "value": round(s.value, 4), "raw_value": s.raw, "weight": round(share, 4),
            "contribution": round(share * s.value, 4), "note": s.note,
        })
    rows.sort(key=lambda r: -r["contribution"])
    return {
        "score": round(score, 4),
        "band": band,
        "band_label": band_label,
        "signals": rows,
        "groups_present": sorted({s.group for s in signals}),
        "version": INDICATOR_VERSION,
    }
