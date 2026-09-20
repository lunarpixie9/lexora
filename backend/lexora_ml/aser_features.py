"""Session-level reading features shared by ASER training and Lexora runtime.

ASER's English subtest is an adaptive ladder: capital letters (CL) -> small
letters (SL) -> words (W) -> sentences (S). The examiner records, per item,
whether it was read correctly and how many mistakes were made, and then assigns
the child a reading level (Beginner / Capital letter / Small letter / word /
Sentence). Lexora's reading task reproduces this ladder with ASER's own
prompts, so the same feature vector can be computed from a Lexora screening.

Levels a child never reached are left as NaN (XGBoost handles missing values
natively) and flagged with `attempted_<level>`.
"""
from __future__ import annotations

import math

LEVELS = ["CL", "SL", "W", "S"]
LEVEL_LABELS = ["Beginner", "Capital letter", "Small letter", "word", "Sentence"]
LEVEL_DISPLAY = {
    "Beginner": "Beginner (letters not yet secure)",
    "Capital letter": "Capital letters",
    "Small letter": "Small letters",
    "word": "Words",
    "Sentence": "Sentences",
}

FEATURE_NAMES: list[str] = ["class_grade"]
for _lvl in LEVELS:
    FEATURE_NAMES += [
        f"attempted_{_lvl}",
        f"items_{_lvl}",
        f"accuracy_{_lvl}",
        f"mean_mistakes_{_lvl}",
        f"mean_seconds_{_lvl}",
    ]
FEATURE_NAMES += ["items_total", "accuracy_overall", "highest_level_attempted"]

FEATURE_LABELS = {
    "class_grade": "School class",
    "items_total": "Reading items attempted",
    "accuracy_overall": "Overall reading accuracy",
    "highest_level_attempted": "Highest ladder level reached",
}
_LEVEL_WORDS = {"CL": "capital letters", "SL": "small letters", "W": "words", "S": "sentences"}
for _lvl, _w in _LEVEL_WORDS.items():
    FEATURE_LABELS[f"attempted_{_lvl}"] = f"Attempted {_w}"
    FEATURE_LABELS[f"items_{_lvl}"] = f"Number of {_w} attempted"
    FEATURE_LABELS[f"accuracy_{_lvl}"] = f"Accuracy on {_w}"
    FEATURE_LABELS[f"mean_mistakes_{_lvl}"] = f"Mistakes per item, {_w}"
    FEATURE_LABELS[f"mean_seconds_{_lvl}"] = f"Seconds per item, {_w}"


def _mean(values):
    values = [v for v in values if v is not None and not (isinstance(v, float) and math.isnan(v))]
    return sum(values) / len(values) if values else float("nan")


def session_features(items: list[dict], class_grade: int | None) -> dict[str, float]:
    """Build the feature dict from per-item records.

    Each item: {"level": "CL"|"SL"|"W"|"S", "correct": bool|None,
                "mistakes": int|None, "seconds": float|None}
    """
    feats: dict[str, float] = {"class_grade": float(class_grade) if class_grade else float("nan")}
    total = correct_total = 0
    highest = 0
    for idx, lvl in enumerate(LEVELS, 1):
        rows = [it for it in items if it.get("level") == lvl]
        judged = [it for it in rows if it.get("correct") is not None]
        feats[f"attempted_{lvl}"] = 1.0 if rows else 0.0
        feats[f"items_{lvl}"] = float(len(rows)) if rows else float("nan")
        feats[f"accuracy_{lvl}"] = (
            sum(1 for it in judged if it["correct"]) / len(judged) if judged else float("nan")
        )
        feats[f"mean_mistakes_{lvl}"] = _mean([it.get("mistakes") for it in rows])
        feats[f"mean_seconds_{lvl}"] = _mean([it.get("seconds") for it in rows])
        if rows:
            highest = idx
        total += len(judged)
        correct_total += sum(1 for it in judged if it["correct"])
    feats["items_total"] = float(total)
    feats["accuracy_overall"] = correct_total / total if total else float("nan")
    feats["highest_level_attempted"] = float(highest)
    return feats


def feature_vector(feats: dict[str, float]) -> list[float]:
    return [feats.get(name, float("nan")) for name in FEATURE_NAMES]


def parse_mistakes(raw: str | None) -> int | None:
    """ASER stores noOfMistakes as text; '200' is a placeholder meaning unknown."""
    if raw is None:
        return None
    raw = str(raw).strip()
    if not raw.isdigit():
        return None
    val = int(raw)
    return None if val >= 100 else val


def normalise_level(raw: str | None) -> str | None:
    """Map ASER's inconsistent level spellings onto LEVEL_LABELS."""
    if not raw:
        return None
    key = raw.strip().lower()
    return {
        "beginner": "Beginner",
        "capital letter": "Capital letter",
        "small letter": "Small letter",
        "word": "word",
        "sentence": "Sentence",
    }.get(key)


def ladder_level(feats: dict[str, float], threshold: float) -> str:
    """Highest ladder level whose accuracy reaches `threshold` (levels must be passed in order)."""
    level = "Beginner"
    for lvl, label in zip(LEVELS, LEVEL_LABELS[1:]):
        acc = feats.get(f"accuracy_{lvl}")
        if acc is None or (isinstance(acc, float) and math.isnan(acc)) or acc < threshold:
            break
        level = label
    return level


def rule_based_level(feats: dict[str, float]) -> str:
    """Transparent fallback used when the trained model is unavailable: the
    highest ladder level with at least 80% accuracy, mirroring ASER's protocol."""
    return ladder_level(feats, 0.8)


def max_plausible_level(feats: dict[str, float]) -> str:
    """Upper bound for the model's estimate, chosen to match what ASER examiners
    actually do: a child is never placed above the highest level attempted (true
    for 99.2% of real sessions) and a child who read none of the capital letters
    is 'Beginner' (95% of real sessions with 0/5). Accuracy-based caps were
    tested and rejected: ~11% of real examiner labels exceed even a 20% rule."""
    acc_cl = feats.get("accuracy_CL")
    if acc_cl is not None and not (isinstance(acc_cl, float) and math.isnan(acc_cl)) and acc_cl == 0:
        return "Beginner"
    return LEVEL_LABELS[int(feats.get("highest_level_attempted") or 0)]
