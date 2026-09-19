"""Reproducible Kaggle downloads into data/raw/ (needs ~/.kaggle/kaggle.json).

  python scripts/data/download_kaggle.py rello
      Downloads luzrello/dyslexia (dyslexia.zip, ~0.4 MB) to data/raw/rello/
      and extracts it beside the zip.

  python scripts/data/download_kaggle.py nnces-pilot
      Downloads ONE read-speech session (10 WAVs) for each of the 50 NNCES
      speakers - 500 files, ~0.65 GB - preserving the corpus directory
      tree under data/raw/nnces/. Session 01 is used unless the manifest
      shows it to be malformed, in which case the next well-formed session
      is taken. Each file is fetched with `kaggle datasets download -f`,
      which wraps it in <name>.zip; the wrapper is unpacked and removed,
      the WAV is kept byte-for-byte. Sizes are checked against
      data/metadata/nnces_file_manifest.json. Re-running skips files that
      are already present with the right size. Four files are fetched concurrently.
"""
import json
import re
import subprocess
import sys
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
MANIFEST = ROOT / "data" / "metadata" / "nnces_file_manifest.json"
NNCES = "kodaliradha20phd7093/nonnative-children-english-speech-nnces-corpus"
RELLO = "luzrello/dyslexia"
PILOT_SELECTION = ROOT / "data" / "metadata" / "nnces_pilot_selection.json"
WORKERS = 4


def kaggle(*args):
    subprocess.run(["kaggle", "datasets", "download", *args, "-q"], check=True)


def download_rello():
    dest = RAW / "rello"
    dest.mkdir(parents=True, exist_ok=True)
    zpath = dest / "dyslexia.zip"
    if not zpath.exists():
        kaggle(RELLO, "-p", str(dest))
    with zipfile.ZipFile(zpath) as z:
        assert z.testzip() is None, "dyslexia.zip failed CRC check"
        z.extractall(dest)
        print(f"rello: {zpath.stat().st_size:,} bytes; extracted {z.namelist()}")


def choose_pilot_sessions(files):
    """Return {speaker: [file dicts]} - one well-formed 10-file read session each."""
    by_session = {}
    for f in files:
        p = f["name"].split("/")
        if p[0] != "Read_Speech_Data":
            continue
        by_session.setdefault((p[4], p[5]), []).append(f)
    chosen, notes = {}, {}
    speakers = sorted({k[0] for k in by_session}, key=lambda s: (s[0], int(s[1:])))
    for spk in speakers:
        for sess in range(1, 11):
            key = (spk, f"{spk}_{sess:02d}")
            rows = sorted(by_session.get(key, []), key=lambda f: f["name"])
            expected = [f"{spk}_{sess:02d}_{i:02d}.wav" for i in range(1, 11)]
            names = [r["name"].split("/")[-1] for r in rows]
            if names == expected and all(r["size"] > 1000 for r in rows):
                chosen[spk] = rows
                if sess != 1:
                    notes[spk] = f"session 01 malformed in manifest; used {sess:02d}"
                break
        else:
            raise RuntimeError(f"no well-formed read session for {spk}")
    return chosen, notes


def fetch_one(dest, f):
    """Download one manifest entry via `-f`, unwrap the transport zip, check size."""
    target = dest / f["name"]
    target.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            kaggle(NNCES, "-f", f["name"], "-p", str(target.parent), "-o")
            break
        except subprocess.CalledProcessError:
            time.sleep(5 * (attempt + 1))
    else:
        raise RuntimeError(f"download failed 3x: {f['name']}")
    wrapper = target.parent / (target.name + ".zip")
    if wrapper.exists():
        with zipfile.ZipFile(wrapper) as z:
            z.extract(target.name, target.parent)
        wrapper.unlink()
    got = target.stat().st_size
    if got != f["size"]:
        raise RuntimeError(f"size mismatch {f['name']}: {got} != {f['size']}")
    return f["name"], got


def download_nnces_pilot():
    files = json.loads(MANIFEST.read_text(encoding="utf-8"))["files"]
    chosen, notes = choose_pilot_sessions(files)
    dest = RAW / "nnces"
    todo = [f for rows in chosen.values() for f in rows]
    PILOT_SELECTION.write_text(json.dumps({
        "dataset": NNCES,
        "rule": "one read-speech session per speaker: session 01 unless malformed",
        "speakers": len(chosen), "files": len(todo),
        "total_bytes": sum(f["size"] for f in todo),
        "fallbacks": notes,
        "selected": [f["name"] for f in todo],
    }, indent=1), encoding="utf-8", newline="\n")
    print(f"pilot: {len(chosen)} speakers, {len(todo)} files, "
          f"{sum(f['size'] for f in todo):,} bytes; fallbacks: {notes or 'none'}")
    pending = [f for f in todo if not ((dest / f["name"]).exists()
                                        and (dest / f["name"]).stat().st_size == f["size"])]
    print(f"already present: {len(todo) - len(pending)}; fetching {len(pending)} "
          f"with {WORKERS} workers", flush=True)
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for name, got in pool.map(lambda f: fetch_one(dest, f), pending):
            done += 1
            print(f"[{done}/{len(pending)}] {name.split('/')[-1]} {got:,} ok", flush=True)
    print("nnces pilot complete")


if __name__ == "__main__":
    {"rello": download_rello, "nnces-pilot": download_nnces_pilot}[sys.argv[1]]()
