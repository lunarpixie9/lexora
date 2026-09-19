"""Verify data/raw/aser against the GitHub tree manifest (size + git blob SHA-1)."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / "data/metadata/aser_github_tree.json").read_text())
blobs = {b["path"]: b for b in manifest["tree"] if b["type"] == "blob"}
raw = ROOT / "data/raw/aser"
local = {p.relative_to(raw).as_posix(): p for p in raw.rglob("*") if p.is_file()}

missing = [p for p in blobs if p not in local]
extra = [p for p in local if p not in blobs]
size_mismatch, sha_mismatch = [], []
for path, b in blobs.items():
    if path not in local:
        continue
    data = local[path].read_bytes()
    if len(data) != b["size"]:
        size_mismatch.append((path, len(data), b["size"]))
        continue
    if hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest() != b["sha"]:
        sha_mismatch.append(path)

result = {
    "manifest_files": len(blobs),
    "local_files": len(local),
    "local_bytes": sum(p.stat().st_size for p in local.values()),
    "missing": missing,
    "extra": extra,
    "size_mismatch": size_mismatch,
    "sha_mismatch": sha_mismatch,
    "ok": not (missing or size_mismatch or sha_mismatch),
}
out = ROOT / "data/metadata/aser_verification.json"
out.write_text(json.dumps(result, indent=2))
print(json.dumps({k: (v if not isinstance(v, list) else len(v)) for k, v in result.items()}, indent=1))
