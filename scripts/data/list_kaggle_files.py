"""List every file in a Kaggle dataset (metadata only, nothing downloaded).

Pages through `kaggle datasets files --format json` using the page token
until the listing is exhausted and writes a manifest to data/metadata/.

Usage: python scripts/data/list_kaggle_files.py <owner>/<dataset> <manifest.json>
"""
import json
import subprocess
import sys
import time

PAGE_SIZE = 200


def fetch_page(dataset, token):
    cmd = ["kaggle", "datasets", "files", "--format", "json",
           "--page-size", str(PAGE_SIZE), dataset]
    if token:
        cmd += ["--page-token", token]
    out = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    next_token = None
    lines = out.splitlines()
    if lines and lines[0].startswith("Next Page Token = "):
        next_token = lines[0].split("= ", 1)[1].strip()
        out = "\n".join(lines[1:])
    return json.loads(out), next_token


def main():
    dataset, manifest_path = sys.argv[1], sys.argv[2]
    files, token, page = [], None, 0
    while True:
        page += 1
        rows, token = fetch_page(dataset, token)
        files.extend(rows)
        print(f"page {page}: +{len(rows)} (total {len(files)})", flush=True)
        if not token or not rows:
            break
        time.sleep(0.3)  # be polite to the API
    manifest = {
        "dataset": dataset,
        "listed_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "file_count": len(files),
        "total_bytes": sum(f["size"] for f in files),
        "files": sorted(files, key=lambda f: f["name"]),
    }
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest, fh, indent=1)
    print(f"wrote {manifest_path}: {manifest['file_count']} files, "
          f"{manifest['total_bytes']:,} bytes")


if __name__ == "__main__":
    main()
