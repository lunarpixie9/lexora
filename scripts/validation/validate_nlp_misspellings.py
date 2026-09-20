"""Validate the Lexora NLP error classifier on real misspelling corpora.

Runs `classify_word_error` / `analyze_text` over the Birkbeck and Holbrook
corpora (data/processed/misspellings/*.csv) and writes
data/metadata/validation_nlp_misspellings.json.

What is being validated: that the deterministic spelling-error engine
(a) detects a real misspelling as an error, (b) never flags a correct word,
(c) assigns at least one explainable pattern to (almost) every real error, and
(d) produces a pattern distribution that is plausible for children's writing.
It does NOT validate anything about dyslexia - the corpora carry no such labels.

Run from the repo root: python scripts/validation/validate_nlp_misspellings.py
"""
import csv
import json
import random
import sys
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from lexora_nlp import analyze_text, classify_word_error, normalize_text  # noqa: E402

PROCESSED = ROOT / "data" / "processed" / "misspellings"
OUT = ROOT / "data" / "metadata" / "validation_nlp_misspellings.json"
SAMPLE = 5000  # Birkbeck has 36k pairs; a fixed-seed sample keeps the run short
random.seed(20260919)


def load_pairs(name):
    rows = list(csv.DictReader(open(PROCESSED / name, encoding="utf-8")))
    pairs = [(r["target"], r["misspelling"]) for r in rows if r["target"] not in ("", "?")]
    # single-token pairs only; multi-word entries ("Doc chm") are word-boundary errors
    return [(t, m) for t, m in pairs if " " not in t.strip() and " " not in m.strip()]


def evaluate(pairs):
    detected = flagged_patterns = identical_after_norm = 0
    pattern_counts, distances, phonetic = Counter(), [], 0
    for target, missp in pairs:
        if normalize_text(target) == normalize_text(missp):
            identical_after_norm += 1  # e.g. only capitalisation differs
            continue
        res = analyze_text(target, missp)
        if res["word_error_rate"] > 0:
            detected += 1
        info = classify_word_error(normalize_text(target), normalize_text(missp))
        if info["patterns"]:
            flagged_patterns += 1
        pattern_counts.update(info["patterns"])
        distances.append(info["edit_distance"])
        phonetic += info["phonetic_plausible"]
    real_errors = len(pairs) - identical_after_norm
    # control: correct words must never be flagged
    false_pos = sum(analyze_text(t, t)["word_error_rate"] > 0 for t, _ in pairs[:1000])
    return {
        "pairs_evaluated": len(pairs),
        "identical_after_normalisation": identical_after_norm,
        "real_errors": real_errors,
        "detected_as_error": detected,
        "detection_rate": round(detected / real_errors, 4) if real_errors else None,
        "assigned_at_least_one_pattern": flagged_patterns,
        "pattern_coverage": round(flagged_patterns / real_errors, 4) if real_errors else None,
        "phonetically_plausible_share": round(phonetic / real_errors, 4) if real_errors else None,
        "mean_edit_distance": round(sum(distances) / len(distances), 3) if distances else None,
        "pattern_distribution": dict(pattern_counts.most_common()),
        "false_positives_on_correct_words": false_pos,
        "control_words_checked": min(1000, len(pairs)),
    }


def main():
    t0 = time.time()
    birkbeck = load_pairs("birkbeck.csv")
    holbrook = load_pairs("holbrook_missp.csv")
    holbrook_tagged = load_pairs("holbrook_tagged_errors.csv")
    report = {
        "validated_at": time.strftime("%Y-%m-%d"),
        "component": "lexora_nlp.classify_word_error / analyze_text",
        "note": (
            "Component validation only. Birkbeck = mixed adult/child misspellings; "
            "Holbrook = real schoolchildren's writing. No dyslexia labels exist in these corpora."
        ),
        "birkbeck_sample": evaluate(random.sample(birkbeck, min(SAMPLE, len(birkbeck)))),
        "holbrook_missp": evaluate(holbrook),
        "holbrook_tagged_running_text": evaluate(holbrook_tagged),
    }
    report["runtime_seconds"] = round(time.time() - t0, 1)
    OUT.write_text(json.dumps(report, indent=1), encoding="utf-8", newline="\n")
    for k in ("birkbeck_sample", "holbrook_missp", "holbrook_tagged_running_text"):
        r = report[k]
        print(
            f"{k}: {r['real_errors']} errors, detection {r['detection_rate']}, "
            f"pattern coverage {r['pattern_coverage']}, phonetic share {r['phonetically_plausible_share']}, "
            f"false positives {r['false_positives_on_correct_words']}"
        )
        print("   patterns:", r["pattern_distribution"])
    print("wrote", OUT)


if __name__ == "__main__":
    main()
