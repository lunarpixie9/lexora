"""Inspect the raw ASER dataset (data/raw/aser) without modifying it.

Reads every per-child ZIP in memory, parses the JSON session file, probes
audio headers with mutagen, and writes:
  data/processed/aser/sessions.csv     one row per child session
  data/processed/aser/items.csv        one row per attempted question
  data/processed/aser/inspection.json  aggregate stats and integrity report
"""
import csv
import io
import json
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

from mutagen import File as MutagenFile

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "aser"
OUT = ROOT / "data" / "processed" / "aser"

SESSION_FIELDS = ["zip", "region", "child_id", "ageGroup", "studClass", "date",
                  "deviceID", "nativeProficiency", "englishProficiency",
                  "n_items", "n_audio", "n_json", "json_name"]
ITEM_FIELDS = ["zip", "region", "child_id", "que_id", "language", "sample_no", "level",
               "count", "que_text", "isCorrect", "noOfMistakes", "recordingName",
               "audio_present", "audio_bytes", "audio_seconds", "audio_sr",
               "audio_channels", "audio_bitrate", "audio_mime"]


def parse_que_id(qid):
    parts = qid.split("_")
    if len(parts) == 4:
        return parts
    return [None, None, None, None]


def probe_audio(data: bytes):
    try:
        info = MutagenFile(io.BytesIO(data))
        if info is None or info.info is None:
            return {"ok": False, "err": "unrecognised"}
        i = info.info
        return {"ok": True, "seconds": round(getattr(i, "length", 0) or 0, 3),
                "sr": getattr(i, "sample_rate", None), "channels": getattr(i, "channels", None),
                "bitrate": getattr(i, "bitrate", None), "mime": (info.mime or [None])[0]}
    except Exception as e:  # noqa: BLE001 - integrity probe, report anything
        return {"ok": False, "err": f"{type(e).__name__}: {e}"}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    zips = sorted(RAW.glob("Data/*/*.zip"))
    if not zips:
        print(f"no zips under {RAW}/Data", file=sys.stderr)
        sys.exit(1)

    sessions, items = [], []
    integrity = {"bad_zip": [], "no_json": [], "multi_json": [], "bad_json": [],
                 "missing_audio": [], "bad_audio": [], "extra_files": Counter()}
    key_sets = Counter()
    item_key_sets = Counter()
    ext_counter = Counter()
    field_values = defaultdict(Counter)

    for zp in zips:
        region = zp.parent.name
        child_id = zp.stem
        try:
            zf = zipfile.ZipFile(zp)
            names = zf.namelist()
            bad = zf.testzip()
            if bad:
                integrity["bad_zip"].append(f"{zp.name}: {bad}")
                continue
        except zipfile.BadZipFile as e:
            integrity["bad_zip"].append(f"{zp.name}: {e}")
            continue

        for n in names:
            ext_counter[Path(n).suffix.lower() or "(none)"] += 1
        json_names = [n for n in names if n.lower().endswith(".json")]
        audio_names = {Path(n).name: n for n in names if not n.lower().endswith(".json")}
        if not json_names:
            integrity["no_json"].append(zp.name)
            continue
        if len(json_names) > 1:
            integrity["multi_json"].append(zp.name)
        try:
            sess = json.loads(zf.read(json_names[0]).decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            integrity["bad_json"].append(f"{zp.name}: {type(e).__name__}")
            continue

        key_sets[tuple(sorted(sess.keys()))] += 1
        for k in ("ageGroup", "studClass", "nativeProficiency", "englishProficiency"):
            field_values[k][str(sess.get(k))] += 1
        seq = sess.get("sequenceList", [])
        sessions.append({"zip": str(zp.relative_to(RAW)), "region": region, "child_id": child_id,
                         "ageGroup": sess.get("ageGroup"), "studClass": sess.get("studClass"),
                         "date": sess.get("date"), "deviceID": sess.get("deviceID"),
                         "nativeProficiency": sess.get("nativeProficiency"),
                         "englishProficiency": sess.get("englishProficiency"),
                         "n_items": len(seq), "n_audio": len(audio_names), "n_json": len(json_names),
                         "json_name": json_names[0]})
        for it in seq:
            item_key_sets[tuple(sorted(it.keys()))] += 1
            qid = it.get("que_id", "")
            lang, sample_no, level, count = parse_que_id(qid)
            rec = it.get("recordingName")
            row = {"zip": str(zp.relative_to(RAW)), "region": region, "child_id": child_id,
                   "que_id": qid, "language": lang, "sample_no": sample_no, "level": level,
                   "count": count, "que_text": it.get("que_text"), "isCorrect": it.get("isCorrect"),
                   "noOfMistakes": it.get("noOfMistakes"), "recordingName": rec,
                   "audio_present": False, "audio_bytes": None, "audio_seconds": None,
                   "audio_sr": None, "audio_channels": None, "audio_bitrate": None, "audio_mime": None}
            if rec and rec in audio_names:
                data = zf.read(audio_names[rec])
                row["audio_present"] = True
                row["audio_bytes"] = len(data)
                p = probe_audio(data)
                if p["ok"]:
                    row.update({"audio_seconds": p["seconds"], "audio_sr": p["sr"],
                                "audio_channels": p["channels"], "audio_bitrate": p["bitrate"],
                                "audio_mime": p["mime"]})
                else:
                    integrity["bad_audio"].append(f"{zp.name}/{rec}: {p['err']}")
            else:
                integrity["missing_audio"].append(f"{zp.name}/{rec}")
            items.append(row)
        referenced = {it.get("recordingName") for it in seq}
        for a in audio_names:
            if a not in referenced:
                integrity["extra_files"][zp.name] += 1

    with (OUT / "sessions.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SESSION_FIELDS)
        w.writeheader()
        w.writerows(sessions)
    with (OUT / "items.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=ITEM_FIELDS)
        w.writeheader()
        w.writerows(items)

    audio_items = [r for r in items if r["audio_seconds"] is not None]
    total_sec = sum(r["audio_seconds"] for r in audio_items)
    by_level = Counter((r["language"], r["level"]) for r in items)
    correct_by_level = defaultdict(Counter)
    for r in items:
        correct_by_level[f"{r['language']}_{r['level']}"][str(r["isCorrect"])] += 1
    mistakes_numeric = 0
    for r in items:
        try:
            int(str(r["noOfMistakes"]))
            mistakes_numeric += 1
        except (TypeError, ValueError):
            pass

    report = {
        "zip_files_found": len(zips),
        "zip_bytes_total": sum(z.stat().st_size for z in zips),
        "sessions_parsed": len(sessions),
        "items_total": len(items),
        "items_with_audio": sum(1 for r in items if r["audio_present"]),
        "items_audio_probed_ok": len(audio_items),
        "audio_total_seconds": round(total_sec, 1),
        "audio_total_hours": round(total_sec / 3600, 2),
        "audio_sample_rates": Counter(r["audio_sr"] for r in audio_items).most_common(),
        "audio_channels": Counter(r["audio_channels"] for r in audio_items).most_common(),
        "audio_bitrates": Counter(r["audio_bitrate"] for r in audio_items).most_common(5),
        "audio_mime": Counter(r["audio_mime"] for r in audio_items).most_common(),
        "audio_seconds_min": min((r["audio_seconds"] for r in audio_items), default=None),
        "audio_seconds_max": max((r["audio_seconds"] for r in audio_items), default=None),
        "extensions_inside_zips": ext_counter.most_common(),
        "session_key_sets": [{"keys": list(k), "n": n} for k, n in key_sets.most_common()],
        "item_key_sets": [{"keys": list(k), "n": n} for k, n in item_key_sets.most_common()],
        "field_values": {k: v.most_common() for k, v in field_values.items()},
        "items_by_language_level": [{"language": l, "level": lv, "n": n} for (l, lv), n in by_level.most_common()],
        "isCorrect_by_language_level": {k: dict(v) for k, v in correct_by_level.items()},
        "noOfMistakes_numeric_count": mistakes_numeric,
        "noOfMistakes_values_top": Counter(str(r["noOfMistakes"]) for r in items).most_common(15),
        "regions": Counter(s["region"] for s in sessions).most_common(),
        "integrity": {k: (v if not isinstance(v, Counter) else dict(v)) for k, v in integrity.items()},
    }
    (OUT / "inspection.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in ("integrity",)}, indent=1, ensure_ascii=False))
    print("integrity counts:", {k: (len(v) if not isinstance(v, Counter) else sum(v.values())) for k, v in integrity.items()})


if __name__ == "__main__":
    main()
