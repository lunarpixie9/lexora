"""Parse the Birkbeck-format misspelling corpora into CSV under data/processed/misspellings/.

Raw files under data/raw/misspellings/ are never modified.

Birkbeck format: a line starting with '$' is the correct (target) word; each
following line (until the next '$') is one misspelling. In holbrook-missp.dat
each misspelling line is followed by a frequency count. Spaces inside words
are encoded as '_'. A target of '$?' means the intended word is unknown.

holbrook-tagged.dat is running text with <ERR targ=X> misspelling </ERR> tags.
"""
import csv
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "misspellings"
OUT = ROOT / "data" / "processed" / "misspellings"

ERR_RE = re.compile(r"<ERR targ=([^>]*)>\s*(.*?)\s*</ERR>", re.DOTALL)


def parse_birkbeck_format(path: Path, has_freq: bool):
    rows = []
    target = None
    with path.open(encoding="latin-1") as f:
        for raw in f:
            line = raw.rstrip("\n").strip()
            if not line:
                continue
            if line.startswith("$"):
                target = line[1:].replace("_", " ")
                continue
            if target is None:
                continue
            freq = 1
            missp = line
            if has_freq:
                parts = line.rsplit(" ", 1)
                if len(parts) == 2 and parts[1].isdigit():
                    missp, freq = parts[0], int(parts[1])
            rows.append({"target": target, "misspelling": missp.replace("_", " "), "freq": freq})
    return rows


def parse_holbrook_tagged(path: Path):
    text = path.read_text(encoding="latin-1")
    rows = []
    for m in ERR_RE.finditer(text):
        rows.append({"target": m.group(1).replace("_", " "), "misspelling": m.group(2)})
    return rows


def write_csv(rows, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def summarize(name, rows):
    targets = {r["target"] for r in rows}
    unknown = sum(1 for r in rows if r["target"] == "?")
    total_freq = sum(r.get("freq", 1) for r in rows)
    print(f"{name}: {len(rows)} misspelling entries, {len(targets)} distinct targets, "
          f"{unknown} with unknown target, weighted total {total_freq}")


def main():
    specs = [
        ("missp.dat", "birkbeck.csv", False),
        ("holbrook-missp.dat", "holbrook_missp.csv", True),
        ("aspell.dat", "aspell.csv", False),
        ("wikipedia.dat", "wikipedia.csv", False),
    ]
    for src, dst, has_freq in specs:
        p = RAW / src
        if not p.exists():
            print(f"missing {p}", file=sys.stderr)
            continue
        rows = parse_birkbeck_format(p, has_freq)
        write_csv(rows, OUT / dst)
        summarize(src, rows)

    tagged = parse_holbrook_tagged(RAW / "holbrook-tagged.dat")
    write_csv(tagged, OUT / "holbrook_tagged_errors.csv")
    summarize("holbrook-tagged.dat", tagged)
    multiword = sum(1 for r in tagged if " " in r["target"] or " " in r["misspelling"])
    print(f"  holbrook-tagged: {multiword} entries involve multi-word targets/misspellings")
    top = Counter(r["target"] for r in tagged).most_common(8)
    print(f"  most frequent Holbrook targets: {top}")


if __name__ == "__main__":
    main()
