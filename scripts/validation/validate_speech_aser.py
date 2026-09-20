"""Validate the Lexora speech pipeline on a reproducible sample of real ASER clips.

For each English level (CL, SL, W, S) a fixed-seed sample of clips is decoded
from the raw session ZIPs (never modified), transcribed with local Whisper and
scored with `item_is_correct`. The Whisper-based judgement is compared with the
examiner's `isCorrect` label. Sentence clips also yield reading-rate statistics.

This validates the speech COMPONENT (transcription + scoring) against real
Indian children's English; it says nothing about dyslexia.

Writes data/metadata/validation_speech_aser.json.
Run from repo root: python scripts/validation/validate_speech_aser.py [--per-level 30]
"""
import argparse
import csv
import json
import random
import statistics
import subprocess
import sys
import tempfile
import time
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from lexora_speech import get_transcriber, item_is_correct, speech_features  # noqa: E402
from lexora_speech.pronunciation import DEFAULT_MODEL  # noqa: E402
from lexora_speech.audio import ffmpeg_exe  # noqa: E402

RAW = ROOT / "data/raw/aser"
ITEMS = ROOT / "data/processed/aser/items.csv"
OUT = ROOT / "data/metadata/validation_speech_aser.json"
LEVELS = ["CL", "SL", "W", "S"]


def sample_items(per_level, seed):
    rows = [r for r in csv.DictReader(ITEMS.open(encoding="utf-8"))
            if r["level"] in LEVELS and r["audio_present"] == "True"
            and r["isCorrect"] in ("True", "False") and 0.5 <= float(r["audio_seconds"]) <= 30]
    rng = random.Random(seed)
    chosen = []
    for lvl in LEVELS:
        pool = [r for r in rows if r["level"] == lvl]
        # balanced: half examiner-correct, half incorrect, so agreement is measured on both classes
        for flag in ("True", "False"):
            sub = [r for r in pool if r["isCorrect"] == flag]
            chosen += rng.sample(sub, min(per_level // 2, len(sub)))
    return chosen


def decode(row, tmp: Path) -> Path:
    with zipfile.ZipFile(RAW / row["zip"]) as zf:
        member = next(n for n in zf.namelist() if n.endswith(row["recordingName"]))
        src = tmp / (row["child_id"] + "_" + row["que_id"] + ".3gp")
        src.write_bytes(zf.read(member))
    dst = src.with_suffix(".wav")
    subprocess.run([ffmpeg_exe(), "-y", "-hide_banner", "-loglevel", "error", "-i", str(src),
                    "-ar", "16000", "-ac", "1", str(dst)], check=True)
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-level", type=int, default=30)
    ap.add_argument("--seed", type=int, default=20260919)
    ap.add_argument("--model", default="small")
    ap.add_argument("--pronunciation-model", default=DEFAULT_MODEL, help="empty string to skip the phoneme layer")
    args = ap.parse_args()

    tr = get_transcriber(args.model, "cpu")
    if tr is None:
        sys.exit("Whisper could not be loaded; nothing to validate")
    items = sample_items(args.per_level, args.seed)
    print(f"{len(items)} clips, engine {tr.engine}")

    t0 = time.time()
    per_level = defaultdict(lambda: {"n": 0, "agree": 0, "tp": 0, "fp": 0, "fn": 0, "tn": 0, "empty_transcripts": 0})
    wpm_correct, examples = [], []
    # phoneme-layer evaluation: collect (level, examiner, PER, whisper_correct) per clip
    pron_rows = []
    with tempfile.TemporaryDirectory() as td:
        for i, r in enumerate(items, 1):
            wav = decode(r, Path(td))
            t = tr.transcribe(str(wav), r["que_text"])
            f = speech_features(str(wav), t, r["que_text"], r["level"], pronunciation_model=args.pronunciation_model or None)
            pron = f.get("pronunciation") or {}
            # Whisper's own judgement, before the phoneme-layer rescue that speech_features applies
            whisper = item_is_correct(r["que_text"], t.text, r["level"])
            if pron.get("scored"):
                pron_rows.append((r["level"], r["isCorrect"] == "True", pron["phoneme_error_rate"], whisper))
            examiner = r["isCorrect"] == "True"
            st = per_level[r["level"]]
            st["n"] += 1
            st["agree"] += examiner == whisper
            st["tp"] += examiner and whisper
            st["fp"] += (not examiner) and whisper
            st["fn"] += examiner and not whisper
            st["tn"] += (not examiner) and not whisper
            st["empty_transcripts"] += not t.text.strip()
            if r["level"] == "S" and examiner and f.get("words_per_minute"):
                wpm_correct.append(f["words_per_minute"])
            if len(examples) < 24 and i % 5 == 0:
                examples.append({"level": r["level"], "expected": r["que_text"], "transcript": t.text,
                                 "examiner_correct": examiner, "whisper_correct": whisper})
            if i % 20 == 0:
                print(f"  {i}/{len(items)} ({time.time() - t0:.0f}s)")

    summary = {}
    for lvl in LEVELS:
        st = per_level[lvl]
        if not st["n"]:
            continue
        prec = st["tp"] / (st["tp"] + st["fp"]) if st["tp"] + st["fp"] else None
        rec = st["tp"] / (st["tp"] + st["fn"]) if st["tp"] + st["fn"] else None
        summary[lvl] = {**st, "agreement": round(st["agree"] / st["n"], 3),
                        "precision_vs_examiner": round(prec, 3) if prec is not None else None,
                        "recall_vs_examiner": round(rec, 3) if rec is not None else None}
    # Phoneme layer: choose, per level, the PER threshold that best agrees with the examiner,
    # and report agreement for the phoneme judgement alone and combined with Whisper.
    phoneme = {}
    for lvl in LEVELS:
        rows = [x for x in pron_rows if x[0] == lvl]
        if len(rows) < 10:
            continue
        best = None
        for thr in [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6]:
            agree = sum((per <= thr) == ex for _, ex, per, _ in rows) / len(rows)
            if best is None or agree > best[1]:
                best = (thr, agree)
        thr = best[0]
        both = sum(((per <= thr) and wc) == ex for _, ex, per, wc in rows) / len(rows)
        either = sum(((per <= thr) or wc) == ex for _, ex, per, wc in rows) / len(rows)
        whisper_only = sum(wc == ex for _, ex, per, wc in rows) / len(rows)
        tp = sum(1 for _, ex, per, _ in rows if ex and per <= thr); fp = sum(1 for _, ex, per, _ in rows if not ex and per <= thr)
        fn = sum(1 for _, ex, per, _ in rows if ex and per > thr)
        phoneme[lvl] = {"n": len(rows), "best_per_threshold": thr, "agreement_phoneme": round(best[1], 3),
                        "agreement_whisper": round(whisper_only, 3), "agreement_both_must_pass": round(both, 3),
                        "agreement_either_passes": round(either, 3),
                        "precision_vs_examiner": round(tp / (tp + fp), 3) if tp + fp else None,
                        "recall_vs_examiner": round(tp / (tp + fn), 3) if tp + fn else None,
                        "median_per_examiner_correct": round(statistics.median([per for _, ex, per, _ in rows if ex]), 3) if any(ex for _, ex, _, _ in rows) else None,
                        "median_per_examiner_incorrect": round(statistics.median([per for _, ex, per, _ in rows if not ex]), 3) if any(not ex for _, ex, _, _ in rows) else None}

    report = {
        "validated_at": time.strftime("%Y-%m-%d"),
        "component": "lexora_speech (faster-whisper transcription + item_is_correct scoring; phoneme pronunciation layer)",
        "engine": tr.engine,
        "sampling": f"{args.per_level} clips per level, balanced on examiner label, seed {args.seed}",
        "clips": len(items),
        "per_level_agreement_with_examiner": summary,
        "phoneme_layer": {"model": args.pronunciation_model or None, "per_level": phoneme,
                          "note": "PER = accent-tolerant phoneme error rate vs dictionary pronunciation; threshold chosen per level on this sample (optimistic by construction), reported alongside Whisper on the same clips."},
        "sentence_wpm_examiner_correct": {
            "n": len(wpm_correct),
            "median": round(sorted(wpm_correct)[len(wpm_correct) // 2], 1) if wpm_correct else None,
            "min": round(min(wpm_correct), 1) if wpm_correct else None,
            "max": round(max(wpm_correct), 1) if wpm_correct else None,
        },
        "examples": examples,
        "interpretation": (
            "Agreement is expected to be high for sentences and words and low for isolated letters, "
            "where general-purpose ASR is unreliable. Lexora therefore keeps ASER's examiner-marking "
            "mode as the primary scoring path for the reading ladder and treats Whisper's letter "
            "judgement as advisory."
        ),
        "runtime_seconds": round(time.time() - t0, 1),
    }
    OUT.write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8", newline="\n")
    for lvl, st in summary.items():
        print(f"{lvl}: n={st['n']} agreement={st['agreement']} precision={st['precision_vs_examiner']} recall={st['recall_vs_examiner']} empty={st['empty_transcripts']}")
    for lvl, ph in phoneme.items():
        print(f"phoneme {lvl}: n={ph['n']} thr={ph['best_per_threshold']} agree phoneme={ph['agreement_phoneme']} whisper={ph['agreement_whisper']} both={ph['agreement_both_must_pass']} either={ph['agreement_either_passes']} | median PER correct={ph['median_per_examiner_correct']} incorrect={ph['median_per_examiner_incorrect']}")
    print("sentence wpm:", report["sentence_wpm_examiner_correct"])
    print("wrote", OUT)


if __name__ == "__main__":
    main()
