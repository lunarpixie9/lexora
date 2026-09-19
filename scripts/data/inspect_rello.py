"""Inspect the Rello et al. dataset CSVs (data/raw/rello) without modifying them.

Writes data/metadata/rello_schema.json with per-file schema, label balance,
NULL pattern and per-column ranges, and prints a summary.
"""
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "rello"
OUT = ROOT / "data" / "metadata" / "rello_schema.json"
FAMILIES = ("Clicks", "Hits", "Misses", "Score", "Accuracy", "Missrate")


def inspect(path):
    raw = path.read_bytes()
    rows = list(csv.reader(raw.decode("utf-8").splitlines(), delimiter=";"))
    hdr, body = rows[0], rows[1:]
    perf = [h for h in hdr if re.fullmatch(r"(%s)\d+" % "|".join(FAMILIES), h)]
    demo = [h for h in hdr if h not in perf and h != "Dyslexia"]
    idx = {h: i for i, h in enumerate(hdr)}
    label = Counter(r[idx["Dyslexia"]] for r in body)
    nulls_by_q = Counter()
    nulls_by_age = Counter()
    rows_with_null = 0
    ranges = {}
    for h in perf:
        vals = [float(r[idx[h]]) for r in body if r[idx[h]] != "NULL"]
        ranges[h] = [min(vals), max(vals)] if vals else None
    for r in body:
        nul = [h for h in perf if r[idx[h]] == "NULL"]
        if nul:
            rows_with_null += 1
            nulls_by_age[r[idx["Age"]]] += 1
            for h in nul:
                nulls_by_q[int(re.search(r"\d+", h).group())] += 1
    fam_ranges = {}
    for fam in FAMILIES:
        rs = [ranges[h] for h in perf if h.startswith(fam) and ranges[h]]
        fam_ranges[fam] = [min(r[0] for r in rs), max(r[1] for r in rs)]
    return {
        "file": path.name, "bytes": len(raw), "delimiter": ";", "line_ending": "CRLF",
        "encoding": "ASCII/UTF-8 (no BOM)", "columns": len(hdr), "rows": len(body),
        "ragged_rows": sum(len(r) != len(hdr) for r in body),
        "column_order": "Gender, Nativelang, Otherlang, Age, then {Clicks,Hits,Misses,Score,Accuracy,Missrate}{1..32}, then Dyslexia",
        "demographic_columns": {h: dict(Counter(r[idx[h]] for r in body)) for h in demo},
        "label_column": "Dyslexia", "label_values": dict(label),
        "label_positive_rate": round(label["Yes"] / len(body), 4),
        "performance_columns": len(perf), "questions": 32,
        "family_value_ranges": fam_ranges,
        "null_token": "NULL", "cells_null": sum(nulls_by_q.values()),
        "rows_with_any_null": rows_with_null,
        "null_cells_by_question": dict(sorted(nulls_by_q.items())),
        "rows_with_null_by_age": dict(sorted(nulls_by_age.items(), key=lambda kv: int(kv[0]))),
    }


def main():
    report = {"dataset": "luzrello/dyslexia", "files": [inspect(RAW / f) for f in ("Dyt-desktop.csv", "Dyt-tablet.csv")]}
    OUT.write_text(json.dumps(report, indent=1), encoding="utf-8", newline="\n")
    for f in report["files"]:
        print(f"{f['file']}: {f['rows']} rows x {f['columns']} cols, label {f['label_values']} "
              f"({f['label_positive_rate']:.1%} positive), NULL cells {f['cells_null']} in {f['rows_with_any_null']} rows")
        print("  ranges:", f["family_value_ranges"])
        print("  demographics:", {k: v for k, v in f["demographic_columns"].items() if k != "Age"})
        print("  ages:", dict(sorted(f["demographic_columns"]["Age"].items(), key=lambda kv: int(kv[0]))))
        if f["cells_null"]:
            print("  NULL by question:", f["null_cells_by_question"])
            print("  rows with NULL by age:", f["rows_with_null_by_age"])
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
