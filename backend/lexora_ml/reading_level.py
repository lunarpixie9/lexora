"""Runtime wrapper around the ASER-trained reading-level model.

Loads backend/lexora_ml/artifacts/reading_level_model.json if present and
explains each prediction with TreeSHAP (XGBoost's native `pred_contribs`, which
computes exact SHAP values for tree models). Falls back to the transparent
ladder rule when the artifact is missing so the app never stops working.
"""
from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

import numpy as np

from .aser_features import (
    FEATURE_LABELS,
    FEATURE_NAMES,
    LEVEL_LABELS,
    feature_vector,
    max_plausible_level,
    rule_based_level,
)

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"


@lru_cache
def load_model():
    """Returns (booster, meta) or (None, meta_or_empty)."""
    meta_path, model_path = ARTIFACTS / "reading_level_meta.json", ARTIFACTS / "reading_level_model.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    if not model_path.exists():
        return None, meta
    import xgboost as xgb

    booster = xgb.Booster()
    booster.load_model(str(model_path))
    return booster, meta


def expected_level_for_class(class_grade: int | None) -> str:
    _, meta = load_model()
    norms = meta.get("class_norms", {})
    if class_grade is not None and str(class_grade) in norms:
        return norms[str(class_grade)]["median_level"]
    # Fallback ladder if the artifact is missing: ASER medians rounded to a simple rule.
    if class_grade is None:
        return "Small letter"
    return "Capital letter" if class_grade <= 1 else "Small letter" if class_grade <= 5 else "word" if class_grade <= 7 else "Sentence"


def wpm_reference(class_grade: int | None) -> dict:
    _, meta = load_model()
    ref = meta.get("sentence_wpm_reference_by_class", {})
    if class_grade is not None and str(class_grade) in ref:
        return ref[str(class_grade)]
    return {"median_wpm": 60.0, "p25_wpm": 42.0, "n": 0}


def predict_reading_level(feats: dict[str, float], class_grade: int | None) -> dict:
    booster, meta = load_model()
    expected = expected_level_for_class(class_grade)
    if booster is None:
        level = rule_based_level(feats)
        return {
            "level": level,
            "expected_level_for_class": expected,
            "gap_levels": LEVEL_LABELS.index(expected) - LEVEL_LABELS.index(level),
            "probabilities": None,
            "shap": [],
            "engine": "rule-based ladder (model artifact not found)",
        }

    import xgboost as xgb

    x = np.array([feature_vector(feats)], dtype=float)
    dm = xgb.DMatrix(x, feature_names=FEATURE_NAMES)
    probs = booster.predict(dm)[0]
    # Ladder consistency (see max_plausible_level): never above the highest level
    # attempted, and 'Beginner' when no capital letter was read - both matched to
    # real examiner behaviour, so held-out accuracy is unchanged.
    max_idx = LEVEL_LABELS.index(max_plausible_level(feats))
    idx = int(np.argmax(probs[: max_idx + 1]))
    level = LEVEL_LABELS[idx]
    # pred_contribs -> (1, classes, features + bias) for multi:softprob
    contribs = booster.predict(dm, pred_contribs=True)
    contribs = np.array(contribs).reshape(len(LEVEL_LABELS), len(FEATURE_NAMES) + 1)[idx][:-1]
    shap_rows = []
    for name, value, c in zip(FEATURE_NAMES, x[0], contribs):
        if math.isnan(value) or abs(c) < 1e-4:
            continue
        shap_rows.append({
            "feature": name,
            "label": FEATURE_LABELS.get(name, name),
            "value": round(float(value), 3),
            "shap": round(float(c), 4),
        })
    shap_rows.sort(key=lambda r: -abs(r["shap"]))
    return {
        "level": level,
        "expected_level_for_class": expected,
        "gap_levels": LEVEL_LABELS.index(expected) - idx,
        "probabilities": {lab: round(float(p), 4) for lab, p in zip(LEVEL_LABELS, probs)},
        "shap": shap_rows[:8],
        "engine": meta.get("version", "aser-reading-level"),
    }
