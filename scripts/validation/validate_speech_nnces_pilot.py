"""Prompt-free speech measures on the NNCES pilot subset (data/raw/nnces).

The uploaded NNCES corpus contains audio only - no prompt text or transcripts -
so this script deliberately does NOT compare transcripts with any expected text
and does not attempt to reconstruct the prompts. It reports what the verified
files support: duration, energy-based pause statistics, Whisper's recognised
word count / speech rate and its confidence, on a reproducible sample of
Telugu-L1 children's read speech.

Writes data/metadata/validation_speech_nnces_pilot.json.
Run from repo root: python scripts/validation/validate_speech_nnces_pilot.py [--files 40]
"""
import argparse
import json
import random
import statistics
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from lexora_speech import get_transcriber, speech_features, to_wav16k  # noqa: E402

RAW = ROOT / "data/raw/nnces"
SELECTION = ROOT / "data/metadata/nnces_pilot_selection.json"
OUT = ROOT / "data/metadata/validation_speech_nnces_pilot.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--files", type=int, default=40)
    ap.add_argument("--seed", type=int, default=20260919)
    ap.add_argument("--model", default="small")
    args = ap.parse_args()
    tr = get_transcriber(args.model, "cpu")
    if tr is None:
        sys.exit("Whisper could not be loaded")
    selected = json.loads(SELECTION.read_text(encoding="utf-8"))["selected"]
    rng = random.Random(args.seed)
    files = rng.sample(selected, min(args.files, len(selected)))
    rows, t0 = [], time.time()
    with tempfile.TemporaryDirectory() as td:
        for i, rel in enumerate(files, 1):
            src = RAW / rel
            wav = to_wav16k(src, Path(td) / (src.stem + ".wav"))  # take channel 1, 16 kHz
            t = tr.transcribe(str(wav))
            # No expected text exists: pass an empty prompt; only prompt-free fields are kept.
            f = speech_features(str(wav), t, "", "passage")
            rows.append({
                "file": rel, "duration_seconds": f["duration_seconds"], "recognized_words": f["recognized_words"],
                "speech_span_seconds": f["speech_span_seconds"], "long_pauses": f["long_pauses"],
                "silence_ratio": f["silence_ratio"], "avg_logprob": f["avg_logprob"],
                "mean_word_confidence": f.get("mean_word_confidence"),
                "words_per_minute": round(f["recognized_words"] / f["speech_span_seconds"] * 60, 1) if f["speech_span_seconds"] else None,
            })
            if i % 10 == 0:
                print(f"  {i}/{len(files)} ({time.time() - t0:.0f}s)")

    def med(key):
        vals = [r[key] for r in rows if r[key] is not None]
        return round(statistics.median(vals), 2) if vals else None

    report = {
        "validated_at": time.strftime("%Y-%m-%d"),
        "component": "lexora_speech prompt-free measures (Whisper + energy-based pauses)",
        "engine": tr.engine,
        "files": len(rows),
        "sampling": f"{args.files} of the 500 pilot files (one read session per speaker), seed {args.seed}",
        "note": (
            "The uploaded NNCES corpus contains audio only; no prompt text or transcripts exist, so no "
            "expected-vs-actual comparison is made and prompts are not reconstructed. These are descriptive "
            "measures of Whisper's behaviour on Telugu-L1 Indian children's read English. Transcripts are not "
            "stored so nothing here can be mistaken for prompt text."
        ),
        "summary": {
            "median_duration_seconds": med("duration_seconds"),
            "median_recognized_words": med("recognized_words"),
            "median_words_per_minute": med("words_per_minute"),
            "median_long_pauses": med("long_pauses"),
            "median_silence_ratio": med("silence_ratio"),
            "median_avg_logprob": med("avg_logprob"),
            "median_word_confidence": med("mean_word_confidence"),
            "empty_transcripts": sum(1 for r in rows if r["recognized_words"] == 0),
        },
        "rows": rows,
        "runtime_seconds": round(time.time() - t0, 1),
    }
    OUT.write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8", newline="\n")
    print(json.dumps(report["summary"], indent=1))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
