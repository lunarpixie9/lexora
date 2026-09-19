"""Verify the NNCES pilot subset in data/raw/nnces against the Kaggle manifest.

Checks: every selected file present, byte size equals the manifest, RIFF/WAVE
header parses, actual sample rate / channels / bit depth, all frames decode,
and whether the two channels are identical (dual-mono). Writes
data/metadata/nnces_pilot_verification.json and prints a summary.
Read-only: raw files are never modified.
"""
import json
import statistics
import struct
from collections import Counter
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "nnces"
MANIFEST = ROOT / "data" / "metadata" / "nnces_file_manifest.json"
SELECTION = ROOT / "data" / "metadata" / "nnces_pilot_selection.json"
OUT = ROOT / "data" / "metadata" / "nnces_pilot_verification.json"


def read_wav(path):
    """Parse RIFF chunks directly (the stdlib `wave` module clamps to the RIFF
    size field, which SurveyLex writes 4 bytes short, silently dropping the
    last frame). Returns ((rate, channels, bits, fmt_tag), samples or None,
    riff_size_field - (file_size - 8))."""
    b = path.read_bytes()
    if b[:4] != b"RIFF" or b[8:12] != b"WAVE":
        raise ValueError("not a RIFF/WAVE file")
    riff_delta = struct.unpack("<I", b[4:8])[0] - (len(b) - 8)
    pos, fmt, data = 12, None, None
    while pos + 8 <= len(b):
        cid, sz = b[pos:pos + 4], struct.unpack("<I", b[pos + 4:pos + 8])[0]
        body = b[pos + 8:pos + 8 + sz]
        if cid == b"fmt ":
            tag, nch, rate, _, _, bits = struct.unpack("<HHIIHH", body[:16])
            fmt = (rate, nch, bits, "PCM" if tag == 1 else f"fmt_tag={tag}")
        elif cid == b"data":
            data = (sz, body)
        pos += 8 + sz + (sz & 1)
    if fmt is None or data is None:
        raise ValueError("missing fmt or data chunk")
    declared, body = data
    rate, nch, bits, _ = fmt
    frame = nch * bits // 8
    if len(body) != declared or declared % frame:
        return fmt, None, riff_delta  # truncated / misaligned data chunk
    return fmt, np.frombuffer(body, dtype="<i2").reshape(-1, nch), riff_delta


def main():
    sizes = {f["name"]: f["size"] for f in json.loads(MANIFEST.read_text(encoding="utf-8"))["files"]}
    selected = json.loads(SELECTION.read_text(encoding="utf-8"))["selected"]
    on_disk = sorted(str(p.relative_to(RAW)).replace("\\", "/") for p in RAW.rglob("*") if p.is_file())
    unexpected = sorted(set(on_disk) - set(selected))
    missing, size_bad, header_bad, decode_bad = [], [], [], []
    params, dual_mono, durations, peak, rms = Counter(), Counter(), [], [], []
    riff_size_deltas = Counter()
    for name in selected:
        p = RAW / name
        if not p.exists():
            missing.append(name)
            continue
        if p.stat().st_size != sizes[name]:
            size_bad.append((name, p.stat().st_size, sizes[name]))
        try:
            pr, a, riff_delta = read_wav(p)
        except ValueError as e:
            header_bad.append((name, str(e)))
            continue
        params[pr] += 1
        riff_size_deltas[riff_delta] += 1
        if a is None:
            decode_bad.append(name)
            continue
        rate, nch = pr[0], pr[1]
        durations.append(len(a) / rate)
        peak.append(int(np.abs(a[:, 0]).max()))
        rms.append(float(np.sqrt((a[:, 0].astype(np.float64) ** 2).mean())))
        if nch == 2:
            dual_mono[bool(np.array_equal(a[:, 0], a[:, 1]))] += 1
    report = {
        "selected_files": len(selected), "present": len(selected) - len(missing),
        "missing": missing, "unexpected_files_in_raw": unexpected,
        "size_mismatches": size_bad, "header_errors": header_bad, "truncated_data_chunks": decode_bad,
        "bytes_on_disk": sum((RAW / n).stat().st_size for n in selected if (RAW / n).exists()),
        "wav_params_counts (rate, channels, bits, format)": {str(k): v for k, v in params.items()},
        "riff_size_field_minus_actual (bytes)": {str(k): v for k, v in riff_size_deltas.items()},
        "note": "RIFF size field is written 4 bytes short by the recorder; data chunk is complete. Python wave drops the last frame; ffmpeg/soundfile are unaffected.",
        "stereo_files_with_identical_channels": dual_mono.get(True, 0),
        "stereo_files_with_differing_channels": dual_mono.get(False, 0),
        "duration_s": {"min": round(min(durations), 2), "median": round(statistics.median(durations), 2),
                       "max": round(max(durations), 2), "total_hours": round(sum(durations) / 3600, 3)} if durations else None,
        "peak_abs_sample": {"min": min(peak), "median": int(statistics.median(peak)), "max": max(peak)} if peak else None,
        "clipped_files (peak>=32767)": sum(p >= 32767 for p in peak),
        "rms_ch0": {"min": round(min(rms), 1), "median": round(statistics.median(rms), 1), "max": round(max(rms), 1)} if rms else None,
        "near_silent_files (rms<50)": sum(r < 50 for r in rms),
    }
    OUT.write_text(json.dumps(report, indent=1), encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
