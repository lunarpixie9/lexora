"""
feature_extraction.py

Takes data/processed/spelling_errors_clean.csv (output of data_cleaning.py)
and runs every (correct_word, misspelling) pair through the rule-based
analyzer in phonetic_rules.py, producing a feature table ready to feed
into the XGBoost risk classifier later.

Note: this file's rows are all *known misspellings*, not (yet) tied to any
individual child or dyslexia/non-dyslexia label. It's the feature-building
half of the pipeline. The label column gets added once you have your
clinician-labeled child samples — see README.md, section "The labeling gap".
"""

from __future__ import annotations
from pathlib import Path
import pandas as pd
from phonetic_rules import analyze_error

PROCESSED_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"
INPUT_CSV = PROCESSED_DIR / "spelling_errors_clean.csv"
OUTPUT_CSV = PROCESSED_DIR / "spelling_features.csv"


def build_feature_table(input_csv: Path = INPUT_CSV) -> pd.DataFrame:
    df = pd.read_csv(input_csv)
    if df.empty:
        print("Input CSV is empty — run data_cleaning.py first.")
        return df

    feature_rows = []
    for _, row in df.iterrows():
        analysis = analyze_error(row["correct_word"], row["misspelling"])
        features = analysis.as_feature_dict()
        features["correct_word"] = row["correct_word"]
        features["misspelling"] = row["misspelling"]
        features["source"] = row["source"]
        feature_rows.append(features)

    out = pd.DataFrame(feature_rows)

    # Quick sanity summary — useful to eyeball before this feeds a model.
    print("Error type distribution:")
    print(out["primary_error_type"].value_counts().to_string())

    return out


if __name__ == "__main__":
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    features = build_feature_table()
    if not features.empty:
        features.to_csv(OUTPUT_CSV, index=False)
        print(f"\nWrote {len(features)} feature rows -> {OUTPUT_CSV}")