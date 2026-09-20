"""Session-level scoring: features -> reading-level model -> composite indicator
-> stored RiskScore/RiskFeature rows, and report assembly."""
from __future__ import annotations

import math
from collections import Counter
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from lexora_ml.aser_features import LEVEL_DISPLAY, session_features
from lexora_ml.indicator import compute_indicator
from lexora_ml.reading_level import predict_reading_level, wpm_reference

from ..models import ProgressRecord, RiskFeature, RiskScore, ScreeningSession
from .analysis import item_correct

DISCLAIMER = (
    "Lexora is an educational screening aid and is not a diagnostic tool. This indicator is generated "
    "from observed literacy signals in this prototype and is not a medical diagnosis. Results indicate "
    "patterns that may warrant further observation or professional assessment."
)
DATA_SOURCES = [
    "Reading ladder items and reading-level model: ASER dataset (Pratham), CC BY-NC-SA 4.0",
    "Spelling-error engine validated on Birkbeck and Holbrook misspelling corpora, CC BY-NC-SA 3.0",
    "XGBoost + SHAP method validated separately on Rello et al. (PLOS ONE 2020), CC BY 4.0 - Spanish data, not used for Lexora scores",
]

PATTERN_LABELS = {
    "mirror_letter_reversal": "mirror-letter reversals (b/d, p/q, m/w, n/u)",
    "sequence_reversal": "whole-word reversals (was/saw)",
    "letter_transposition": "swapped letter order (form/from)",
    "letter_omission": "letters left out",
    "letter_addition": "extra letters added",
    "vowel_confusion": "vowel confusions (pen/pin)",
    "letter_substitution": "letter substitutions",
    "phonetic_spelling": "sound-alike spellings (sed/said)",
    "double_letter_dropped": "double letters dropped",
    "word_omitted": "words left out",
    "word_added": "extra words added",
}


def _reading_items(session: ScreeningSession) -> list[dict]:
    items = []
    for t in session.tasks:
        if t.kind != "reading" or t.status == "skipped" or t.response is None:
            continue
        r = t.response
        sr = r.speech_result.features if r.speech_result else {}
        items.append({
            "task_id": t.id,
            "level": t.item_level,
            "prompt": t.prompt_text,
            "correct": item_correct(t),
            "mistakes": sr.get("mistakes", 0 if item_correct(t) else 1),
            "seconds": r.duration_seconds or sr.get("duration_seconds"),
            "engine": sr.get("engine"),
            "transcript": sr.get("transcript"),
        })
    return items


def _writing_summary(session: ScreeningSession) -> dict:
    results = [t.response.text_result.features for t in session.tasks
               if t.kind == "writing" and t.response and t.response.text_result]
    if not results:
        return {}
    keys = ["total_words", "correct_words", "spelling_error_count", "omission_count", "addition_count",
            "substitution_count", "transposition_count", "reversal_count", "phonetic_error_count",
            "letter_omission_count", "letter_addition_count", "letter_substitution_count", "vowel_confusion_count",
            "edit_distance"]
    agg = {k: sum(r.get(k, 0) for r in results) for k in keys}
    agg["word_error_rate"] = round(
        (agg["spelling_error_count"] + agg["omission_count"] + agg["addition_count"]) / agg["total_words"], 4
    ) if agg["total_words"] else 0.0
    agg["accuracy"] = round(agg["correct_words"] / agg["total_words"], 4) if agg["total_words"] else 0.0
    patterns = Counter()
    for r in results:
        patterns.update(r.get("pattern_counts", {}))
    agg["pattern_counts"] = dict(patterns.most_common())
    agg["items"] = [
        {"prompt": t.prompt_text, "answer": t.response.response_text,
         "accuracy": t.response.text_result.features["accuracy"],
         "word_errors": t.response.text_result.features["word_errors"]}
        for t in session.tasks if t.kind == "writing" and t.response and t.response.text_result
    ]
    return agg


def _speech_summary(session: ScreeningSession, class_grade: int) -> dict:
    for t in session.tasks:
        if t.kind == "speech" and t.response and t.response.speech_result:
            f = dict(t.response.speech_result.features)
            f["prompt"] = t.prompt_text
            f["wpm_reference"] = wpm_reference(class_grade)["median_wpm"]
            return f
    return {}


def _error_profile(reading_items, writing, speech) -> dict:
    """Skills to target in practice, derived only from observed errors."""
    profile = {"patterns": {}, "letters_missed": [], "words_missed": [], "target_skills": []}
    for it in reading_items:
        if it["correct"] is False:
            (profile["letters_missed"] if it["level"] in ("CL", "SL") else profile["words_missed"]).append(it["prompt"])
    for k, v in (writing.get("pattern_counts") or {}).items():
        if v:
            profile["patterns"][k] = v
    for w in (speech.get("word_errors") or []):
        if w.get("expected") and w.get("actual") is not None:
            profile["words_missed"].append(w["expected"])
    skills = []
    if profile["letters_missed"]:
        skills.append("letter_recognition")
    if profile["patterns"].get("mirror_letter_reversal") or profile["patterns"].get("sequence_reversal") \
            or profile["patterns"].get("letter_transposition"):
        skills.append("letter_order_and_orientation")
    if profile["patterns"].get("phonetic_spelling") or profile["patterns"].get("vowel_confusion"):
        skills.append("sound_to_spelling")
    if profile["patterns"].get("letter_omission") or profile["patterns"].get("double_letter_dropped"):
        skills.append("complete_spelling")
    if profile["words_missed"] or (writing.get("word_error_rate", 0) > 0.2):
        skills.append("sight_words")
    if speech.get("words_per_minute") and speech.get("wpm_reference") \
            and speech["words_per_minute"] < 0.8 * speech["wpm_reference"]:
        skills.append("reading_fluency")
    if not skills:
        skills.append("reading_fluency")
    profile["target_skills"] = skills
    profile["words_missed"] = sorted(set(profile["words_missed"]))
    profile["letters_missed"] = sorted(set(profile["letters_missed"]))
    return profile


def _narrative(child_name, reading, writing, speech, indicator) -> list[str]:
    lines = [f"{indicator['band_label']} for {child_name} (composite score {indicator['score']:.2f} of 1)."]
    lvl = LEVEL_DISPLAY.get(reading.get("level"), reading.get("level"))
    exp = LEVEL_DISPLAY.get(reading.get("expected_level_for_class"), "")
    if reading.get("level"):
        gap = reading.get("gap_levels", 0)
        rel = "in line with" if gap <= 0 else ("one step below" if gap == 1 else f"{gap} steps below")
        lines.append(f"Observed reading pattern: reading level estimated at '{lvl}', {rel} the typical level "
                     f"for class {reading.get('class_grade')} in the ASER data ('{exp}').")
    if writing.get("total_words"):
        lines.append(f"Writing: {writing['correct_words']} of {writing['total_words']} dictated words spelt correctly. "
                     + (f"Detected error patterns: " + ", ".join(
                         PATTERN_LABELS.get(k, k) for k, _ in Counter(writing['pattern_counts']).most_common(3)) + "."
                        if writing.get("pattern_counts") else "No recurring error pattern detected."))
    if speech.get("expected_words"):
        engine = speech.get("engine", "")
        rate = f", about {speech['words_per_minute']:.0f} words per minute" if speech.get("words_per_minute") else ""
        lines.append(f"Speech: passage read with {speech.get('word_error_rate', 0):.0%} word mismatch{rate}"
                     f" (transcribed by {engine}).")
    if any(s["group"] == "speech" and s["note"].endswith("demo") for s in indicator["signals"]):
        lines.append("Speech features were produced by the demo transcriber, not real speech recognition.")
    lines.append("These are observed patterns from a short screening. They may warrant closer observation; "
                 "they are not a diagnosis.")
    return lines


def score_session(db: Session, session: ScreeningSession) -> RiskScore:
    child = session.child
    items = _reading_items(session)
    feats = session_features(
        [{"level": i["level"], "correct": i["correct"], "mistakes": i["mistakes"], "seconds": i["seconds"]} for i in items],
        child.class_grade,
    )
    reading = predict_reading_level(feats, child.class_grade) if items else {}
    reading.update({k: (None if isinstance(v, float) and math.isnan(v) else v)
                    for k, v in feats.items() if k.startswith("accuracy_")})
    reading["class_grade"] = child.class_grade
    reading["items"] = items
    writing = _writing_summary(session)
    speech = _speech_summary(session, child.class_grade)
    indicator = compute_indicator(reading if items else None, writing or None, speech or None)
    profile = _error_profile(items, writing, speech)
    explanation = {
        "narrative": _narrative(child.first_name, reading, writing, speech, indicator),
        "reading": {k: v for k, v in reading.items() if k != "items"} | {"items": items},
        "writing": writing,
        "speech": speech,
        "error_profile": profile,
        "indicator": indicator,
    }
    rs = session.risk_score or RiskScore(session_id=session.id)
    rs.score = indicator["score"]
    rs.band = indicator["band"]
    rs.reading_level_estimate = reading.get("level", "n/a")
    rs.expected_level_for_class = reading.get("expected_level_for_class", "n/a")
    rs.explanation = explanation
    rs.model_version = f"{indicator['version']} + {reading.get('engine', 'no reading model')}"
    rs.created_at = datetime.utcnow()
    db.add(rs)
    db.flush()
    for f in list(rs.features):
        db.delete(f)
    # re-scoring (teacher review after completion) replaces this session's progress records
    for rec in db.scalars(select(ProgressRecord).where(ProgressRecord.source == f"screening:{session.id}")):
        db.delete(rec)
    db.flush()
    for s in indicator["signals"]:
        db.add(RiskFeature(risk_score_id=rs.id, name=s["name"], label=s["label"], value=s["value"],
                           raw_value=s["raw_value"], weight=s["weight"], contribution=s["contribution"],
                           group=s["group"]))
    db.add(ProgressRecord(child_id=child.id, metric="screening_score", value=indicator["score"],
                          source=f"screening:{session.id}"))
    if writing.get("total_words"):
        db.add(ProgressRecord(child_id=child.id, metric="spelling_accuracy", value=writing["accuracy"],
                              source=f"screening:{session.id}"))
    if items:
        judged = [i for i in items if i["correct"] is not None]
        if judged:
            db.add(ProgressRecord(child_id=child.id, metric="reading_accuracy",
                                  value=sum(i["correct"] for i in judged) / len(judged),
                                  source=f"screening:{session.id}"))
    if session.status != "completed":
        session.status = "completed"
        session.completed_at = datetime.utcnow()
    return rs


def _previous_summary(session: ScreeningSession) -> dict | None:
    """The most recent earlier completed screening of the same child, for a change line."""
    earlier = [s for s in session.child.sessions
               if s.id != session.id and s.risk_score is not None and s.completed_at
               and session.completed_at and s.completed_at < session.completed_at]
    if not earlier:
        return None
    prev = max(earlier, key=lambda s: s.completed_at)
    return {"session_id": prev.id, "date": prev.completed_at, "score": prev.risk_score.score,
            "band": prev.risk_score.band, "reading_level": prev.risk_score.reading_level_estimate,
            "score_change": round(session.risk_score.score - prev.risk_score.score, 4)}


def build_report(session: ScreeningSession) -> dict:
    rs = session.risk_score
    ex = rs.explanation
    child = session.child
    return {
        "session_id": session.id,
        "child": {"id": child.id, "first_name": child.first_name, "age": child.age,
                  "class_grade": child.class_grade, "is_demo": child.is_demo},
        "generated_at": rs.created_at,
        "indicator": {**ex["indicator"], "session_mode": session.mode},
        "features": [{"name": f.name, "label": f.label, "group": f.group, "value": f.value, "raw_value": f.raw_value,
                      "weight": f.weight, "contribution": f.contribution,
                      "note": next((s["note"] for s in ex["indicator"]["signals"] if s["name"] == f.name), "")}
                     for f in rs.features],
        "reading": ex["reading"],
        "writing": ex["writing"],
        "speech": ex["speech"],
        "error_profile": ex["error_profile"],
        "narrative": ex["narrative"],
        "previous": _previous_summary(session),
        "disclaimer": DISCLAIMER,
        "model_version": rs.model_version,
        "data_sources": DATA_SOURCES,
    }
