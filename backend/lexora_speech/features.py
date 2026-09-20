"""Speech / fluency features and ASER-style item scoring.

Only features that make sense for the item type are produced: a single letter
gets a correct/incorrect judgement and a duration, a sentence or passage also
gets word error rate, reading rate and pause statistics.
"""
from __future__ import annotations

import numpy as np

from lexora_nlp import analyze_text, levenshtein, normalize_text, phonetically_similar, tokenize

from .audio import load_audio
from .transcribe import Transcript

# How Whisper tends to write out a spoken letter name (Indian-English variants included).
LETTER_NAMES = {
    "a": {"a", "ay", "eh"}, "b": {"b", "be", "bee"}, "c": {"c", "see", "sea", "si"},
    "d": {"d", "dee", "de"}, "e": {"e", "ee", "i"}, "f": {"f", "ef", "eff"},
    "g": {"g", "gee", "ji", "jee"}, "h": {"h", "aitch", "ach", "etch", "hedge", "each"},
    "i": {"i", "eye", "ai"}, "j": {"j", "jay", "je"}, "k": {"k", "kay", "ke", "okay"},
    "l": {"l", "el", "ell"}, "m": {"m", "em"}, "n": {"n", "en", "and"}, "o": {"o", "oh", "ooh"},
    "p": {"p", "pee", "pe", "pi"}, "q": {"q", "cue", "queue", "kyu", "kew", "que"},
    "r": {"r", "are", "ar"}, "s": {"s", "es", "ess", "yes"}, "t": {"t", "tee", "tea", "ti"},
    "u": {"u", "you", "yu"}, "v": {"v", "vee", "we", "ve"}, "w": {"w", "double u", "doubleu", "dabal you", "w."},
    "x": {"x", "ex", "eks"}, "y": {"y", "why", "wai"}, "z": {"z", "zed", "zee", "jed", "said"},
}
LONG_PAUSE_SECONDS = 0.5


def item_is_correct(expected: str, transcript_text: str, level: str) -> bool:
    """ASER-style correctness from a transcript. Letters: the letter or its spoken
    name. Words: exact or a one-edit phonetic match (tolerates accent-driven ASR
    spelling). Sentences/passages: at least 75% of words correct."""
    exp, got = normalize_text(expected), normalize_text(transcript_text)
    if not got:
        return False
    if level in ("CL", "SL"):
        letter = exp[:1]
        return got in LETTER_NAMES.get(letter, {letter}) or got.replace(" ", "") == letter
    if level in ("W", "word_dictation"):
        if got == exp:
            return True
        return levenshtein(got, exp) <= 1 and phonetically_similar(got, exp)
    res = analyze_text(expected, transcript_text)
    return res["accuracy"] >= 0.75


def _energy_pauses(samples: np.ndarray, sr: int) -> dict:
    """Energy-based silence detection, independent of the recogniser."""
    frame = int(0.02 * sr)
    if len(samples) < frame * 5:
        return {"speech_span_seconds": 0.0, "long_pauses": 0, "silence_ratio": 1.0}
    n = len(samples) // frame
    rms = np.sqrt((samples[: n * frame].reshape(n, frame) ** 2).mean(axis=1))
    floor = np.percentile(rms, 10)
    thr = max(floor * 3, np.percentile(rms, 95) * 0.08, 1e-4)
    voiced = rms > thr
    idx = np.flatnonzero(voiced)
    if len(idx) == 0:
        return {"speech_span_seconds": 0.0, "long_pauses": 0, "silence_ratio": 1.0}
    span = voiced[idx[0]: idx[-1] + 1]
    long_pauses, run = 0, 0
    for v in span:
        run = 0 if v else run + 1
        if run == int(LONG_PAUSE_SECONDS / 0.02):
            long_pauses += 1
    return {
        "speech_span_seconds": round(len(span) * 0.02, 2),
        "long_pauses": long_pauses,
        "silence_ratio": round(float(1 - span.mean()), 3),
    }


def speech_features(wav_path: str, transcript: Transcript, expected_text: str, level: str) -> dict:
    samples, sr = load_audio(wav_path)
    duration = len(samples) / sr
    pauses = _energy_pauses(samples, sr)
    exp_tokens = tokenize(expected_text)
    got_tokens = tokenize(transcript.text)
    correct = item_is_correct(expected_text, transcript.text, level)

    feats = {
        "engine": transcript.engine,
        "transcript": transcript.text,
        "duration_seconds": round(duration, 2),
        "expected_words": len(exp_tokens),
        "recognized_words": len(got_tokens),
        "item_correct": correct,
        "avg_logprob": round(transcript.avg_logprob, 3) if transcript.avg_logprob is not None else None,
        **pauses,
    }
    if transcript.words:
        gaps = [b.start - a.end for a, b in zip(transcript.words, transcript.words[1:])]
        feats["word_gap_pauses"] = sum(1 for g in gaps if g >= LONG_PAUSE_SECONDS)
        feats["mean_word_confidence"] = round(float(np.mean([w.probability for w in transcript.words])), 3)

    # Word-level comparison only makes sense for words and longer
    if level not in ("CL", "SL"):
        cmp = analyze_text(expected_text, transcript.text)
        feats.update({
            "word_error_rate": cmp["word_error_rate"],
            "accuracy": cmp["accuracy"],
            "substitutions": cmp["substitution_count"],
            "omissions": cmp["omission_count"],
            "additions": cmp["addition_count"],
            "repetitions": cmp["repetition_count"],
            "word_errors": cmp["word_errors"],
        })
    # Reading rate and pause density only for multi-word items
    if len(exp_tokens) >= 4:
        span = pauses["speech_span_seconds"] or duration
        if span > 0 and got_tokens:
            feats["words_per_minute"] = round(len(got_tokens) / span * 60, 1)
            feats["long_pauses_per_10_words"] = round(pauses["long_pauses"] / max(len(got_tokens), 1) * 10, 2)
    return feats
