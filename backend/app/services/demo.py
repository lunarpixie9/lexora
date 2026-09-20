"""Clearly-labelled demo responses.

`fill_demo_responses` answers every pending task of a screening with scripted,
deterministic content so the complete flow can be demonstrated without a
microphone or a real child. Everything it produces is run through the *real*
analysis code (text features, ladder rule, indicator); only the responses
themselves are synthetic, and the session is marked mode="demo" and speech
results engine="demo" so the UI can say so.
"""
from __future__ import annotations

import random

from sqlalchemy.orm import Session

from lexora_nlp import analyze_text, tokenize
from lexora_speech.transcribe import DemoTranscriber

from ..models import ScreeningResponse, ScreeningSession, ScreeningTask, SpeechAnalysisResult
from .analysis import analyse_examiner_mark, analyse_text_response, apply_ladder_rule

# Probability that a demo child misreads an item at each ladder level (scaled by `severity`)
P_WRONG = {"CL": 0.1, "SL": 0.25, "W": 0.45, "S": 0.6}
SWAPS = {"b": "d", "d": "b", "p": "q", "e": "i", "i": "e", "a": "e", "u": "o"}


def _ensure_response(db: Session, t: ScreeningTask) -> ScreeningResponse:
    if t.response is None:
        t.response = ScreeningResponse(task_id=t.id)
        db.add(t.response)
        db.flush()
    t.status = "answered"
    return t.response


def fill_demo_responses(db: Session, s: ScreeningSession, severity: float = 1.0) -> None:
    rng = random.Random(s.id * 31 + int(severity * 100))
    s.mode = "demo"
    for t in s.tasks:
        if t.status != "pending":
            continue
        r = _ensure_response(db, t)
        if t.kind == "reading":
            wrong = rng.random() < P_WRONG[t.item_level] * severity
            base = rng.uniform(1.2, 2.5) * (1 + 0.6 * ["CL", "SL", "W", "S"].index(t.item_level) / 2)
            r.duration_seconds = round(base * (1.6 if wrong else 1), 2)
            analyse_examiner_mark(db, r, correct=not wrong, mistakes=rng.randint(1, 2) if wrong else 0)
            apply_ladder_rule(s)
        elif t.kind == "writing":
            words = []
            for w in tokenize(t.prompt_text):
                if len(w) > 2 and rng.random() < 0.35 * severity:
                    i = next((k for k, ch in enumerate(w) if ch in SWAPS), None)
                    w = w[:i] + SWAPS[w[i]] + w[i + 1:] if i is not None else w[:-1]
                words.append(w)
            r.response_text = " ".join(words)
            analyse_text_response(db, r)
        else:  # speech passage: demo transcript, no audio file
            transcript = DemoTranscriber().transcribe("", t.prompt_text)
            n_words = len(tokenize(transcript.text))
            duration = round(n_words / rng.uniform(38, 55) * 60 * (0.8 + 0.2 * severity), 1)
            cmp = analyze_text(t.prompt_text, transcript.text)
            long_pauses = rng.randint(1, 4)
            feats = {
                "engine": "demo", "transcript": transcript.text, "duration_seconds": duration,
                "expected_words": len(tokenize(t.prompt_text)), "recognized_words": n_words,
                "item_correct": cmp["accuracy"] >= 0.75, "avg_logprob": None,
                "speech_span_seconds": duration, "long_pauses": long_pauses, "silence_ratio": 0.2,
                "word_error_rate": cmp["word_error_rate"], "accuracy": cmp["accuracy"],
                "substitutions": cmp["substitution_count"], "omissions": cmp["omission_count"],
                "additions": cmp["addition_count"], "repetitions": cmp["repetition_count"],
                "word_errors": cmp["word_errors"],
                "words_per_minute": round(n_words / duration * 60, 1),
                "long_pauses_per_10_words": round(long_pauses / max(n_words, 1) * 10, 2),
            }
            r.duration_seconds = duration
            r.speech_result = SpeechAnalysisResult(engine="demo", transcript=transcript.text, features=feats)
    db.flush()
