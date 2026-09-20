"""Methodological validation of XGBoost + SHAP on the Rello et al. dataset.

This is a SEPARATE experiment. The Rello data (Spanish gamified Dytective test,
PLOS ONE 2020, CC BY 4.0) has genuine dyslexia diagnoses, so it can show that
the same classifier + explainer approach Lexora uses produces sensible,
explainable separation on real diagnosed data. Its features (clicks/hits/misses
in a game) are NOT Lexora's features and its results do NOT transfer to
Lexora's screening indicator or establish any clinical validity for Lexora.

Preprocessing follows data/metadata/rello_profile.md:
  * Accuracy / Missrate are recomputed from Hits/Misses/Clicks (stored values
    lost their leading "0." in ~3% of cells)
  * tablet "NULL" -> NaN
  * Nativelang dropped (encoded inconsistently between the two files)

Outputs data/metadata/validation_rello_xgboost_shap.json and a copy in
backend/lexora_ml/artifacts/ for the API's methodology page.

Run from repo root: python backend/lexora_ml/validate_rello.py
"""
from __future__ import annotations

import csv
import json
import time
from pathlib import Path

import numpy as np
import shap
import xgboost as xgb
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RAW = ROOT / "data" / "raw" / "rello"
OUT = ROOT / "data" / "metadata" / "validation_rello_xgboost_shap.json"
ARTIFACT = HERE / "artifacts" / "rello_validation.json"
SEED = 20260919
Q = 32
THRESHOLDS = (0.5, 0.3)


def load(name):
    rows = list(csv.DictReader(open(RAW / name, encoding="utf-8", newline=""), delimiter=";"))
    names, X, y = [], [], []
    for r in rows:
        feats = {
            "Gender_male": 1.0 if r["Gender"] == "Male" else 0.0,
            "Otherlang_yes": 1.0 if r["Otherlang"] == "Yes" else 0.0,
            "Age": float(r["Age"]),
        }
        for q in range(1, Q + 1):
            def num(col):
                v = r[f"{col}{q}"]
                return float("nan") if v == "NULL" else float(v)
            clicks, hits, misses, score = num("Clicks"), num("Hits"), num("Misses"), num("Score")
            feats[f"Clicks{q}"], feats[f"Hits{q}"], feats[f"Misses{q}"], feats[f"Score{q}"] = clicks, hits, misses, score
            # recompute the ratio columns instead of trusting the stored text
            feats[f"Accuracy{q}"] = hits / clicks if clicks and clicks > 0 else (0.0 if clicks == 0 else float("nan"))
            feats[f"Missrate{q}"] = misses / clicks if clicks and clicks > 0 else (0.0 if clicks == 0 else float("nan"))
        if not names:
            names = list(feats)
        X.append([feats[n] for n in names])
        y.append(1 if r["Dyslexia"] == "Yes" else 0)
    return names, np.array(X), np.array(y)


def make_model(pos_weight):
    return xgb.XGBClassifier(
        n_estimators=400, max_depth=4, learning_rate=0.05, subsample=0.9, colsample_bytree=0.8,
        scale_pos_weight=pos_weight, objective="binary:logistic", eval_metric="logloss",
        random_state=SEED, n_jobs=4,
    )


def main():
    t0 = time.time()
    names, Xd, yd = load("Dyt-desktop.csv")
    _, Xt, yt = load("Dyt-tablet.csv")
    pos_weight = (yd == 0).sum() / (yd == 1).sum()

    # 5-fold stratified CV on the main (desktop) dataset
    folds, cv_scores = StratifiedKFold(5, shuffle=True, random_state=SEED), []
    for tr, te in folds.split(Xd, yd):
        m = make_model(pos_weight).fit(Xd[tr], yd[tr])
        prob = m.predict_proba(Xd[te])[:, 1]
        row = {"roc_auc": roc_auc_score(yd[te], prob)}
        for thr in THRESHOLDS:  # 0.5 = default; 0.3 = recall-oriented, as the paper prioritises recall
            pred = (prob >= thr).astype(int)
            row[f"recall@{thr}"] = recall_score(yd[te], pred)
            row[f"precision@{thr}"] = precision_score(yd[te], pred, zero_division=0)
            row[f"f1@{thr}"] = f1_score(yd[te], pred)
        cv_scores.append(row)
    cv = {k: round(float(np.mean([s[k] for s in cv_scores])), 4) for k in cv_scores[0]}
    cv_sd = {k: round(float(np.std([s[k] for s in cv_scores])), 4) for k in cv_scores[0]}

    # Train on all desktop rows, test on the separate tablet dataset
    final = make_model(pos_weight).fit(Xd, yd)
    prob_t = final.predict_proba(Xt)[:, 1]
    tablet = {"roc_auc": round(float(roc_auc_score(yt, prob_t)), 4)}
    for thr in THRESHOLDS:
        pred_t = (prob_t >= thr).astype(int)
        tablet[f"recall@{thr}"] = round(float(recall_score(yt, pred_t)), 4)
        tablet[f"precision@{thr}"] = round(float(precision_score(yt, pred_t, zero_division=0)), 4)
        tablet[f"f1@{thr}"] = round(float(f1_score(yt, pred_t)), 4)

    sv = shap.TreeExplainer(final).shap_values(Xd)
    mean_abs = np.abs(np.array(sv)).mean(axis=0)
    top = sorted(zip(names, mean_abs), key=lambda t: -t[1])[:15]

    report = {
        "experiment": "XGBoost + SHAP methodological validation on Rello et al. (PLOS ONE 2020)",
        "validated_at": time.strftime("%Y-%m-%d"),
        "dataset": "luzrello/dyslexia (Kaggle, CC BY 4.0) - Spanish Dytective test, ages 7-17",
        "n_desktop": int(len(yd)), "positives_desktop": int(yd.sum()),
        "n_tablet": int(len(yt)), "positives_tablet": int(yt.sum()),
        "features_used": len(names),
        "preprocessing": [
            "Accuracy/Missrate recomputed from Hits/Misses/Clicks",
            "tablet NULL -> NaN (XGBoost native missing handling)",
            "Nativelang dropped (inconsistent encoding between files)",
            f"scale_pos_weight={pos_weight:.2f} for class imbalance",
        ],
        "cv_5fold_desktop_mean": cv,
        "cv_5fold_desktop_sd": cv_sd,
        "train_desktop_test_tablet": tablet,
        "paper_reference": "Rello et al. report recall as the primary metric for the dyslexia class",
        "transfer_note": (
            "The tablet dataset is an age-customised test version in which 13 of 32 items are missing for "
            "most children, so a model trained on the desktop version transfers poorly to it. This is "
            "reported as-is: it illustrates that such classifiers are tied to the exact instrument they "
            "were trained on - one more reason Lexora's indicator is not a diagnostic claim."
        ),
        "shap_top_features_mean_abs": [{"feature": f, "mean_abs_shap": round(float(v), 4)} for f, v in top],
        "interpretation": (
            "The classifier separates diagnosed from non-diagnosed children well above chance and SHAP "
            "attributes the decision to a small set of game-performance features. This validates the "
            "method Lexora uses (gradient-boosted trees + SHAP), NOT Lexora's own indicator: the features, "
            "language and population differ, and no clinical validity is claimed for Lexora."
        ),
        "runtime_seconds": round(time.time() - t0, 1),
    }
    for path in (OUT, ARTIFACT):
        path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps(report, indent=1), encoding="utf-8", newline="\n")
    print("5-fold CV (desktop):", cv, "+/-", cv_sd)
    print("desktop -> tablet:", tablet)
    print("top SHAP:", [(f, v) for f, v in top[:8]])
    print("wrote", OUT)


if __name__ == "__main__":
    main()
