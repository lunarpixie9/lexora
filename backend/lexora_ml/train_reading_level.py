"""Train the ASER reading-level model (XGBoost multiclass) and explain it with SHAP.

Data: data/processed/aser/items.csv + sessions.csv (derived from the real ASER
dataset by scripts/data/inspect_aser.py). Label: the examiner-assigned English
reading level. Features: session_features() from aser_features.py.

Important caveat, also written into the metadata: ASER examiners assign the
level from the same item performance the features summarise, so high accuracy
is expected. The model learns the examiner's ladder rule from real data; it is
a component validation of the feature -> reading-level mapping and a source of
class-wise norms, not evidence about dyslexia.

Outputs (backend/lexora_ml/artifacts/):
  reading_level_model.json  XGBoost booster
  reading_level_meta.json   feature names, classes, metrics, SHAP summary, class norms
Also copies the metrics to data/metadata/validation_aser_reading_level.json.

Run from repo root: python backend/lexora_ml/train_reading_level.py
"""
from __future__ import annotations

import csv
import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import xgboost as xgb
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from lexora_ml.aser_features import (  # noqa: E402
    FEATURE_NAMES,
    LEVEL_LABELS,
    feature_vector,
    normalise_level,
    parse_mistakes,
    rule_based_level,
    session_features,
)

ROOT = HERE.parents[1]
ASER = ROOT / "data" / "processed" / "aser"
ARTIFACTS = HERE / "artifacts"
META_OUT = ROOT / "data" / "metadata" / "validation_aser_reading_level.json"
SEED = 20260919


def load_sessions():
    sessions = {}
    for r in csv.DictReader(open(ASER / "sessions.csv", encoding="utf-8")):
        label = normalise_level(r["englishProficiency"])
        cls = r["studClass"].strip()
        if label is None or not cls.isdigit() or not 1 <= int(cls) <= 8:
            continue
        sessions[r["zip"]] = {"label": label, "class_grade": int(cls), "items": []}
    wpm_by_class = defaultdict(list)  # real reading-rate reference: correctly read sentences
    for r in csv.DictReader(open(ASER / "items.csv", encoding="utf-8")):
        s = sessions.get(r["zip"])
        lvl = r["level"].upper()
        if s is None or lvl not in ("CL", "SL", "W", "S"):
            continue
        correct = {"True": True, "False": False}.get(r["isCorrect"])
        secs = float(r["audio_seconds"]) if r["audio_seconds"] else None
        s["items"].append(
            {"level": lvl, "correct": correct, "mistakes": parse_mistakes(r["noOfMistakes"]), "seconds": secs}
        )
        if lvl == "S" and correct and secs and 1.0 <= secs <= 60.0:
            words = len(r["que_text"].split())
            wpm_by_class[s["class_grade"]].append(words / secs * 60)
    return {k: v for k, v in sessions.items() if v["items"]}, wpm_by_class


def main():
    t0 = time.time()
    sessions, wpm_by_class = load_sessions()
    X, y, classes, rule_pred = [], [], [], []
    for s in sessions.values():
        feats = session_features(s["items"], s["class_grade"])
        X.append(feature_vector(feats))
        y.append(LEVEL_LABELS.index(s["label"]))
        classes.append(s["class_grade"])
        rule_pred.append(LEVEL_LABELS.index(rule_based_level(feats)))
    X, y = np.array(X, dtype=float), np.array(y)
    print(f"sessions with label + English items: {len(y)}; label counts: "
          f"{dict(sorted(Counter(LEVEL_LABELS[i] for i in y).items()))}")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)
    model = xgb.XGBClassifier(
        n_estimators=300, max_depth=4, learning_rate=0.08, subsample=0.9,
        colsample_bytree=0.9, objective="multi:softprob", num_class=len(LEVEL_LABELS),
        random_state=SEED, n_jobs=4, eval_metric="mlogloss",
    )
    model.fit(X_tr, y_tr)
    pred = model.predict(X_te)
    acc = accuracy_score(y_te, pred)
    f1 = f1_score(y_te, pred, average="macro")
    cm = confusion_matrix(y_te, pred, labels=list(range(len(LEVEL_LABELS)))).tolist()
    rule_acc = accuracy_score(y, rule_pred)
    print(f"XGBoost held-out accuracy {acc:.4f}, macro-F1 {f1:.4f}; rule-based baseline accuracy {rule_acc:.4f}")

    # SHAP (TreeExplainer) on the held-out set: mean |SHAP| per feature, averaged over classes
    import shap

    explainer = shap.TreeExplainer(model)
    sv = explainer.shap_values(X_te)
    sv = np.array(sv)  # (n, features, classes) in shap>=0.45 or (classes, n, features)
    if sv.ndim == 3 and sv.shape[0] == X_te.shape[0]:
        mean_abs = np.abs(sv).mean(axis=(0, 2))
    else:
        mean_abs = np.abs(sv).mean(axis=(0, 1))
    shap_summary = sorted(
        ({"feature": f, "mean_abs_shap": round(float(v), 4)} for f, v in zip(FEATURE_NAMES, mean_abs)),
        key=lambda d: -d["mean_abs_shap"],
    )

    # Class-wise norms from the real data: distribution of examiner level per school class.
    by_class = defaultdict(Counter)
    for c, lab in zip(classes, y):
        by_class[c][LEVEL_LABELS[lab]] += 1
    norms = {}
    for c in sorted(by_class):
        cnt = by_class[c]
        total = sum(cnt.values())
        ordered = [cnt[l] for l in LEVEL_LABELS]
        cum, median = 0, LEVEL_LABELS[-1]
        for lab, n in zip(LEVEL_LABELS, ordered):
            cum += n
            if cum >= total / 2:
                median = lab
                break
        norms[str(c)] = {
            "n": total,
            "distribution": {l: round(cnt[l] / total, 4) for l in LEVEL_LABELS},
            "median_level": median,
        }

    ARTIFACTS.mkdir(exist_ok=True)
    model.get_booster().save_model(str(ARTIFACTS / "reading_level_model.json"))
    meta = {
        "model": "xgboost.XGBClassifier multi:softprob",
        "version": "aser-reading-level-1.0",
        "trained_at": time.strftime("%Y-%m-%d"),
        "dataset": "ASER (Pratham) English subtest, CC BY-NC-SA 4.0; sessions with examiner level and class 1-8",
        "n_sessions": int(len(y)),
        "n_train": int(len(y_tr)),
        "n_test": int(len(y_te)),
        "feature_names": FEATURE_NAMES,
        "classes": LEVEL_LABELS,
        "metrics": {
            "holdout_accuracy": round(float(acc), 4),
            "holdout_macro_f1": round(float(f1), 4),
            "confusion_matrix_rows_true_cols_pred": cm,
            "rule_based_baseline_accuracy_all_sessions": round(float(rule_acc), 4),
        },
        "shap_mean_abs_by_feature": shap_summary,
        "class_norms": norms,
        "sentence_wpm_reference_by_class": {
            str(c): {"n": len(v), "median_wpm": round(float(np.median(v)), 1),
                     "p25_wpm": round(float(np.percentile(v, 25)), 1)}
            for c, v in sorted(wpm_by_class.items()) if len(v) >= 20
        },
        "caveat": (
            "The examiner level is assigned from the same item performance that the features summarise, "
            "so high accuracy is expected. This validates the feature-to-reading-level mapping and "
            "provides real class-wise norms; it says nothing about dyslexia."
        ),
        "runtime_seconds": round(time.time() - t0, 1),
    }
    (ARTIFACTS / "reading_level_meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8", newline="\n")
    META_OUT.write_text(json.dumps(meta, indent=1), encoding="utf-8", newline="\n")
    print("top SHAP features:", [(d["feature"], d["mean_abs_shap"]) for d in shap_summary[:6]])
    print("class norms (median level):", {c: v["median_level"] for c, v in norms.items()})
    print("wrote", ARTIFACTS / "reading_level_model.json", "and", META_OUT)


if __name__ == "__main__":
    main()
