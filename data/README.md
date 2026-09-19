# Lexora Data Directory

Real datasets are Lexora's primary data source (PROJECT_SPEC.md §11, §21).
Research and access verification: `docs/DATASET_RESEARCH.md`.

```
data/
  raw/         original downloads — NEVER modified, NEVER committed (.gitignore)
  processed/   copies/derivatives written by scripts/data/*.py — not committed
  metadata/    per-dataset profiles, manifests, verification results — committed
```

Scripts live in `scripts/data/`. Run from the repository root with
`python scripts/data/<name>.py`. Python 3.13; `mutagen`, `imageio-ffmpeg`
(bundled ffmpeg) and `openpyxl` were used for inspection.

## Status summary

| Dataset | Status | Raw location | Files | Size |
|---|---|---|---|---|
| ASER (Pratham) | downloaded, verified | `raw/aser/` | 5,318 (5,301 session ZIPs) | 848.6 MB |
| Birkbeck + Holbrook misspelling corpora | downloaded, verified | `raw/misspellings/` | 6 | ~640 KB |
| NNCES Corpus | pilot subset downloaded, verified (1 read session × 50 speakers); full corpus deferred | `raw/nnces/` | 500 of 10,000 | 645.7 MB (full: 12.17 GB) |
| Rello "Predicting Risk of Dyslexia" | downloaded, verified | `raw/rello/` | 1 zip → 2 CSV | 399 KB zip / 3.0 MB CSV |

---

## 1. ASER Dataset (Pratham)

- Source: Pratham / ASER Centre (India); Agarwal, Gupchup, Baghel, ICASSP 2020
- URL: https://github.com/PrathamOrg/ASER-Dataset
- License: CC BY-NC-SA 4.0
- Download date: 2026-09-19 (GitHub ZIP archive; git clone failed on connection resets)
- Files: 5,318 total; 5,301 per-child session ZIPs under `Data/{Hindi RJ, Hindi UP, Marathi MH}`, each holding one JSON + AMR-WB audio clips (81,338 clips, 123.7 h)
- English subtest (levels CL/SL/W/S): 60,966 clips with audio, 47.3 h, from 5,010 children, each with the prompt text (`que_text`) and examiner `isCorrect` label — this is why ASER is Lexora's PRIMARY real speech/reading dataset (PROJECT_SPEC.md §21)
- Size: 848,589,712 bytes (848.6 MB); `Data/` alone 772.4 MB
- Verification: all 5,318 files match the GitHub tree manifest by size and git SHA-1 (`metadata/aser_verification.json`); all ZIPs pass `testzip`; all 81,339 referenced clips decode
- Intended Lexora use: real Indian children's read-aloud audio for the speech pipeline (Whisper transcription vs. `que_text`, WPM/pause calibration); examiner `isCorrect` labels and reading-level labels as reference; English letter/word/sentence subtest
- Preprocessing required: audio is 3GP/AMR-WB 16 kHz mono despite `.mp3` names — decode with ffmpeg; normalise inconsistent label spellings; treat `noOfMistakes == "200"` as unknown; see `metadata/aser_profile.md`
- Processed outputs: `processed/aser/sessions.csv`, `items.csv`, `inspection.json`, `samples/` (8 WAV examples)

## 2. Birkbeck + Holbrook misspelling corpora

- Source: Roger Mitton, Birkbeck, University of London
- URL: https://titan.dcs.bbk.ac.uk/~ROGER/corpora.html (archival copy: Oxford Text Archive 20.500.12024/0643)
- License: CC BY-NC-SA 3.0 (as stated by the Oxford Text Archive record)
- Download date: 2026-09-19
- Files: 6 — `missp.dat` (Birkbeck, 36,133 misspellings / 6,136 words), `holbrook-missp.dat` (1,791 / 1,200, with frequencies), `holbrook-tagged.dat` (children's running text with inline `<ERR>` tags, 18 writers), `aspell.dat`, `wikipedia.dat`, `corpora.html` (saved source page)
- Size: ~640 KB, pure ASCII
- Verification: parsed counts match the published figures exactly; no unreadable files
- Intended Lexora use: validate the spelling-error engine (edit distance, grapheme comparison, phonetic similarity) on real misspellings; Holbrook = real schoolchildren's writing
- Preprocessing required: trivial `$target` / misspelling parsing; done by `scripts/data/parse_misspellings.py` → `processed/misspellings/*.csv`

## 3. NNCES Corpus — pilot subset

- Source: Kaggle upload by kodaliradha20phd7093
- URL: https://www.kaggle.com/datasets/kodaliradha20phd7093/nonnative-children-english-speech-nnces-corpus
- License: CC0 (verified from the dataset page metadata)
- Download date: 2026-09-19 (pilot) via Kaggle CLI, `scripts/data/download_kaggle.py nnces-pilot`; complete file listing in `metadata/nnces_file_manifest.json`
- Full corpus: 10,000 `.wav` only (5,000 `Read_Speech_Data` + 5,000 `Spontaneous_Speech_Data`), 12.17 GB unzipped / 6.69 GB zip; 50 children (8–12, Telugu L1), 10 sessions × 10 items each. **No transcripts, prompts or metadata files** despite the page description — prompt text has NOT been reconstructed
- Pilot on disk: 500 WAVs (read session 01 for every speaker), 645,682,672 bytes, original directory tree preserved; selection in `metadata/nnces_pilot_selection.json`
- Verification: all 500 sizes match the manifest; all PCM 44.1 kHz / 2 ch / 16-bit; channel 2 is a bit-exact copy of channel 1 (dual-mono); 1.02 h audio; RIFF size field 4 bytes short in every file (use ffmpeg/soundfile, not stdlib `wave`) — `metadata/nnces_pilot_verification.json`
- Decision: full download deferred — ASER already covers the prompt-aligned use case. See `metadata/nnces_profile.md`
- Intended Lexora use: Whisper validation and pronunciation-mismatch / WPM tuning on real Indian children's English
- Preprocessing required: take channel 1 and resample to 16 kHz (ffmpeg) into `processed/nnces/`
- Tradeoff: a 984 MB pre-resampled copy exists (`mirfan899/kids-speech-dataset`, GPL-2.0). Prefer the CC0 original; see `metadata/nnces_profile.md`

## 4. Rello et al. "Predicting Risk of Dyslexia"

- Source: Luz Rello (Kaggle); PLOS ONE 2020, doi:10.1371/journal.pone.0241687
- URL: https://www.kaggle.com/datasets/luzrello/dyslexia (DOI 10.34740/kaggle/dsv/1617514)
- License: CC BY 4.0
- Download date: 2026-09-19 via Kaggle CLI (`scripts/data/download_kaggle.py rello`)
- Files / size: `dyslexia.zip` 399,262 bytes (matches page metadata) → `Dyt-desktop.csv` (3,644 rows × 197 cols, 392 dyslexia) and `Dyt-tablet.csv` (1,395 × 197, 148 dyslexia); semicolon-delimited; row counts match the paper
- Verification: zip CRC clean; schema and label counts in `metadata/rello_schema.json` (`scripts/data/inspect_rello.py`)
- Intended Lexora use: separate real-data validation experiment for the XGBoost + SHAP methodology — NOT a source of Lexora features or English content
- Preprocessing required: recompute `Accuracy`/`Missrate` from `Hits`/`Misses`/`Clicks` (stored values have lost their leading `0.` in ~3% of cells); treat tablet `NULL` as missing; encode Yes/No strings; `Nativelang` encoded inconsistently between files — see `metadata/rello_profile.md`

---

## Excluded

- Dyslexia Handwriting Dataset (Kaggle, drizasazanitaisa): license declared "Unknown"; image-based — excluded from the core pipeline by decision (PROJECT_SPEC.md §21).
- All LDC corpora (CMU Kids, CSLU Kids, H1 Children's Writing): paid/restricted.

## Rules

- Never edit files under `raw/`. Derive into `processed/` with a script.
- Never commit `raw/` or `processed/`.
- Cite each dataset in the report; CC BY-NC-SA sources restrict commercial use.
- Synthetic/demo data must be labelled as such and never mixed into these directories.
