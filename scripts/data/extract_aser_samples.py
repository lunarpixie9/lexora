"""Extract a few representative ASER clips as 16 kHz mono WAV into data/processed/aser/samples/.

Raw ZIPs are read-only; this only writes converted copies. Requires ffmpeg
(uses the imageio-ffmpeg bundled binary if no system ffmpeg is present).
"""
import csv
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/raw/aser"
PROC = ROOT / "data/processed/aser"
OUT = PROC / "samples"

PICKS = [  # (language, level, isCorrect, mistakes-filter) -> first match with audio >= 1s
    ("HI", "S", "True", lambda m: m in ("0", "1")),
    ("HI", "S", "False", lambda m: m not in ("200",)),
    ("HI", "S", "False", lambda m: m == "200"),
    ("HI", "W", "True", lambda m: True),
    ("HI", "W", "False", lambda m: True),
    ("HI", "CL", "True", lambda m: True),
    ("MR", "S", "True", lambda m: True),
    ("HI", "ST", "True", lambda m: True),
]


def ffmpeg_exe():
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = list(csv.DictReader((PROC / "items.csv").open(encoding="utf-8")))
    ff = ffmpeg_exe()
    chosen = []
    for lang, level, correct, mf in PICKS:
        for r in rows:
            if (r["language"], r["level"], r["isCorrect"]) == (lang, level, correct) and r["audio_present"] == "True" \
                    and mf(r["noOfMistakes"]) and float(r["audio_seconds"]) >= 1.0:
                chosen.append(r)
                break
    manifest = []
    for r in chosen:
        zf = zipfile.ZipFile(RAW / r["zip"])
        member = next(n for n in zf.namelist() if n.endswith(r["recordingName"]))
        src = OUT / f"{r['child_id']}_{r['que_id']}.3gp"
        dst = src.with_suffix(".wav")
        src.write_bytes(zf.read(member))
        subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", "-i", str(src),
                        "-ar", "16000", "-ac", "1", str(dst)], check=True)
        src.unlink()
        manifest.append({"wav": dst.name, "source_zip": r["zip"], "que_id": r["que_id"],
                         "que_text": r["que_text"], "isCorrect": r["isCorrect"],
                         "noOfMistakes": r["noOfMistakes"], "seconds": r["audio_seconds"],
                         "region": r["region"]})
    with (OUT / "samples.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(manifest[0].keys()))
        w.writeheader()
        w.writerows(manifest)
    for m in manifest:
        print(m["wav"], "|", m["que_text"][:40], "| correct:", m["isCorrect"], "| mistakes:", m["noOfMistakes"], "|", m["seconds"], "s")


if __name__ == "__main__":
    main()
