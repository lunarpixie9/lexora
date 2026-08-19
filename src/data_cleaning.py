"""
data_cleaning.py

Normalizes the raw spelling-error corpora into one unified CSV:
    correct_word, misspelling, source

Drop the raw downloaded files into data/raw/ before running this:
    data/raw/birkbeck.dat      (or whatever Roger Mitton's page names it, e.g. APPLING1DAT.643 etc.)
    data/raw/holbrook-missp
    data/raw/aspell

FORMAT NOTE: Mitton's corpus files use a "$word" header line followed by
one misspelling per line until the next "$" line, e.g.:

    $ability
    abilty
    ablity
    $ability
    abillity

The parser below handles that format. The exact filenames/layout can vary
slightly depending on which files you pulled from the corpora page — check
the docs bundled with the download and adjust RAW_FILES below if needed.
Run with --inspect first to sanity-check a new/unfamiliar file before
trusting the parse.
"""

from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path
import pandas as pd

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"

# Map: filename in data/raw/  ->  source label recorded in the output CSV
RAW_FILES = {
    "birkbeck.dat": "birkbeck",
    "holbrook-missp": "holbrook",
    "aspell": "aspell",
}

WORD_RE = re.compile(r"^[a-zA-Z]+$")


def parse_dollar_format(path: Path, source: str) -> list[dict]:
    """Parse Mitton's '$word' header + misspelling-lines-below format."""
    rows = []
    current_word = None
    with path.open(encoding="utf-8", errors="ignore") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("$"):
                current_word = line[1:].strip().lower()
                continue
            if current_word is None:
                continue
            # Some files append a frequency count after whitespace — take the first token.
            misspelling = line.split()[0].lower()
            if WORD_RE.match(current_word) and WORD_RE.match(misspelling):
                rows.append({
                    "correct_word": current_word,
                    "misspelling": misspelling,
                    "source": source,
                })
    return rows


def clean_and_merge(raw_dir: Path = RAW_DIR) -> pd.DataFrame:
    all_rows: list[dict] = []
    for filename, source in RAW_FILES.items():
        path = raw_dir / filename
        if not path.exists():
            print(f"  [skip] {filename} not found in {raw_dir} — place the downloaded "
                  f"file there and re-run.", file=sys.stderr)
            continue
        rows = parse_dollar_format(path, source)
        print(f"  [ok]   {filename}: parsed {len(rows)} pairs")
        all_rows.extend(rows)

    if not all_rows:
        print("No raw files found. Nothing to clean yet — see the header comment "
              "in this file for expected filenames.", file=sys.stderr)
        return pd.DataFrame(columns=["correct_word", "misspelling", "source"])

    df = pd.DataFrame(all_rows)

    before = len(df)
    df = df.drop_duplicates(subset=["correct_word", "misspelling"])
    df = df[df["correct_word"] != df["misspelling"]]  # drop no-op "corrections"
    df = df.dropna()
    after = len(df)
    print(f"Deduplicated: {before} -> {after} rows")

    return df.reset_index(drop=True)


def inspect_file(filename: str, n: int = 20):
    """Print the first n raw lines of a file so you can confirm its format before parsing."""
    path = RAW_DIR / filename
    if not path.exists():
        print(f"{path} does not exist.")
        return
    with path.open(encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f):
            if i >= n:
                break
            print(f"{i:>3} | {line.rstrip()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", metavar="FILENAME",
                         help="Print first 20 raw lines of data/raw/FILENAME to check its format")
    args = parser.parse_args()

    if args.inspect:
        inspect_file(args.inspect)
        sys.exit(0)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df = clean_and_merge()
    out_path = PROCESSED_DIR / "spelling_errors_clean.csv"
    df.to_csv(out_path, index=False)
    print(f"\nWrote {len(df)} cleaned pairs -> {out_path}")