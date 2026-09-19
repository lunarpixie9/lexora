# NNCES Corpus Profile (Non-Native Children English Speech)

Status: PILOT SUBSET DOWNLOADED AND VERIFIED (2026-09-19) — 500 of
10,000 files (one read-speech session per speaker). Full corpus
deliberately NOT downloaded; see "Decision" below.

## Why it is pending

Kaggle dataset downloads require a logged-in Kaggle account. Verified
directly: the download URL returns `HTTP 302` to
`https://www.kaggle.com/account/login?...`. This environment has no
Kaggle CLI installed, no `~/.kaggle/kaggle.json`, and no
`KAGGLE_USERNAME`/`KAGGLE_KEY` variables. No attempt was made to
bypass authentication.

A free Kaggle account (email or Google sign-in, no payment, no
institutional approval) is all that is needed. Access class: B.

## Exact dataset

- Name: Non-Native Children English Speech (NNCES) Corpus
- Kaggle URL:
  https://www.kaggle.com/datasets/kodaliradha20phd7093/nonnative-children-english-speech-nnces-corpus
- Uploader: kodaliradha20phd7093 (Kaggle)
- Version: 1 (last modified 2022-10-29)
- License: CC0: Public Domain (verified from the dataset page's
  schema.org metadata)
- Download size: 6,687,814,398 bytes (~6.69 GB, zipped) — verified
  from page metadata

## Re-verification (2026-09-19, later the same day)

A browser attempt returned Kaggle's "We can't find that page". Re-checked
server-side without login: the canonical URL, `/versions/1` and `/data`
all return HTTP 200 with the correct title and unchanged metadata
(ID 2587386, v1, 6,687,814,398 bytes, CC0, modified 2022-10-29). The
dataset has not moved, been renamed or been removed; the browser error
was a client-side issue (most likely a mangled paste of the long slug
or a transient Kaggle SPA failure).

Third check after a session interruption (2026-09-19, later again),
with a calibration so the result is meaningful:

| Probe | Result |
|---|---|
| Deliberately wrong slug under the same owner | HTTP 404, generic "Kaggle: Your Home for Data Science" title (this is what a removed dataset looks like) |
| Canonical NNCES URL, `/data`, `/versions/1` | HTTP 200, title "Non-Native Children English Speech (NNCES) Corpus", JSON-LD unchanged (ID 2587386, v1, 6,687,814,398 bytes, CC0, 2022-10-29) |
| Owner profile `kaggle.com/kodaliradha20phd7093` and `/datasets` | HTTP 200, "Kodali Radha" — account still exists |
| Anonymous download URL | HTTP 302 to `/account/login` (a removed dataset would 404, not redirect) |
| Mini corpus and `mirfan899/kids-speech-dataset` | both HTTP 200 |

Conclusion: the dataset is present and unchanged. If the browser shows
"We can't find that page" again, open the owner's profile
(https://www.kaggle.com/kodaliradha20phd7093/datasets) and click through
to the dataset instead of typing/pasting the slug. Non-browser check once
the API token is configured:
`kaggle datasets files kodaliradha20phd7093/nonnative-children-english-speech-nnces-corpus`.

Same author also publishes "Non-Native Children Speech Mini Corpus"
(https://www.kaggle.com/datasets/kodaliradha20phd7093/nonnative-children-speech-mini-corpus):
20 children, ages 7–12, Telugu L1, same SurveyLex setup, 1,214,699,262
bytes, but license declared "Unknown". Not a substitute for the CC0
full corpus; only a documented fallback if 6.69 GB is impractical, and
it would need the same license disclosure as any "Unknown"-licensed
source.

## What the dataset page states (verified from page metadata)

- 50 children, 25 female / 25 male, ages 8–12
- All native Telugu speakers (Indian regional language) learning
  English as a second language
- Audio captured with the SurveyLex platform: `.wav`, dual channel,
  44.1 kHz, 16-bit
- Each questionnaire was conducted 10 times per child to capture
  variation in words and sentences
- ~20 hours total
- 5,000 read-speech utterances + 5,000 spontaneous-speech utterances
- Word-level transcription is stated for the spontaneous portion —
  NOT present in the upload (verified against the complete file listing)

## Verified from the complete file listing (2026-09-19, no download)

`scripts/data/list_kaggle_files.py` paged through the Kaggle file API
(50 pages x 200) and wrote `metadata/nnces_file_manifest.json`.

- **10,000 files, all `.wav`, 12,172,310,208 bytes uncompressed**
  (the 6.69 GB zip therefore compresses the audio ~45%, consistent with
  a near-silent or duplicated second channel).
- **No transcripts, no prompt texts, no metadata file, no README.**
  The page's claim of "word level transcription" for the spontaneous
  half is NOT borne out by the uploaded files. Age and gender are
  encoded only in the folder names.
- Layout (identical for both halves):
  `<Half>/<Half>/<age>Y/<Boys|Girls>_<age>/<spk>/<spk>_<session>/<spk>_<session>_<item>.wav`
  - `Read_Speech_Data`: 5,000 files, 6,459,153,248 bytes, ~10.2 h
  - `Spontaneous_Speech_Data`: 5,000 files, 5,713,156,960 bytes, ~9.0 h
  - 5 age folders (8Y-12Y) x 2 genders = 10 groups x 5 speakers = 50
    speakers (`M1`-`M25`, `F1`-`F25`; M1-5/F1-5 are 8-year-olds, ... ,
    M21-25/F21-25 are 12-year-olds)
  - 10 sessions per speaker x 10 items per session = 100 files per
    speaker per half; 500 sessions per half
- Read-speech items: median 5.3-7.6 s each; per-child read total
  8.2-21.3 min (median 11.7). Item durations are consistent across
  sessions, so the 10 read items are very likely 10 fixed prompts
  repeated 10 times - but the prompt texts are not supplied.
- Anomalies: 1 header-only 44-byte file
  (`.../8Y/Boys_8/M5/M5_10/M5_10_01.wav`); 39 non-standard filenames
  (e.g. `M9/M9_10/M10_01.wav`, `M14_03/M14_0301.wav`).
- Per-file download IS possible (`kaggle datasets download -f <path>`),
  but the read half alone is 6.46 GB uncompressed across 5,000 calls -
  no saving over the single 6.69 GB zip. A small pilot (e.g. one
  session for each of the 50 speakers = 500 files, ~0.65 GB, or 10
  speakers = 100 files, ~0.13 GB) is the only meaningful subset.

## Pilot subset — downloaded and verified (2026-09-19)

Selection rule (`scripts/data/download_kaggle.py nnces-pilot`, recorded
in `nnces_pilot_selection.json`): for each of the 50 speakers, read-speech
session `01` (10 items). Session 01 was well-formed for every speaker, so
no fallbacks were needed. Files were fetched one at a time with
`kaggle datasets download -f` (Kaggle wraps each in a transport zip,
which was unpacked and removed; the WAV bytes are untouched) into the
corpus's own directory tree under `data/raw/nnces/`. One transient
Kaggle 503 was retried successfully.

Verification (`scripts/data/verify_nnces_pilot.py` →
`nnces_pilot_verification.json`):

- 500/500 files present, 0 missing, 0 unexpected; every byte size equals
  the Kaggle manifest; 645,682,672 bytes on disk (615.8 MiB)
- WAV headers: **all 500 are PCM, 44,100 Hz, 2 channels, 16-bit** — the
  page description is accurate
- **Channel 2 is a bit-exact copy of channel 1 in all 500 files**
  (dual-mono). Downmix by taking channel 1; nothing is lost. This also
  explains why the 12.17 GB corpus zips to 6.69 GB.
- Data chunks complete and frame-aligned in all 500 files; 0 near-silent
  files; 12 files touch full-scale (peak = 32767, i.e. some clipping)
- Durations: 2.9 s min, 6.1 s median, 39.5 s max; 1.017 h total
- Header quirk: the RIFF size field is 4 bytes short of the true value in
  every file. Python's `wave` therefore drops the final frame (23 µs);
  ffmpeg, soundfile and librosa read the `data` chunk and are unaffected.
  Parse with those, or handle RIFF chunks directly as the verifier does.

**No prompt or transcript text exists anywhere in the uploaded corpus**
(confirmed against the complete 10,000-file listing: `.wav` only). The
read prompts have NOT been reconstructed and must not be inferred from
the audio without an explicit, documented decision to do so; until then
NNCES pilot audio is usable only for prompt-free measures (duration,
speech rate proxies, pause statistics, Whisper robustness on Indian
children's English) and not for expected-vs-actual comparison.

Still unknown: the wording of the 10 read items.

## Comparison with ASER (already downloaded)

| | ASER English subtest (have) | NNCES read half (not downloaded) |
|---|---|---|
| Children | 5,010 (classes 1-8, ~6-13 y) | 50 (8-12 y) |
| L1 | Hindi, Marathi | Telugu |
| English clips with audio | 60,966 (47.3 h): 22,013 capital letters, 17,941 small letters, 14,612 words, 6,225 sentences | 5,000 (~10.2 h), ~6 s sentences/passages |
| Prompt text per clip | YES (`que_text`, 97 distinct) | NO |
| Correctness label | YES (examiner `isCorrect`, `noOfMistakes`) | NO |
| Speaker metadata | age/class, region, proficiency | age, gender (folder names only) |
| Audio | AMR-WB 16 kHz mono (phone quality), 1.7-4.3 s median | 44.1 kHz stereo WAV (studio-ish), 5-8 s |
| Repeats per child | none | 10 sessions x 10 items |
| Spontaneous speech | no | 5,000 clips, untranscribed |
| Lexora fit | expected-vs-actual, WPM, correctness calibration: direct | expected-vs-actual impossible without prompts; WPM only after self-transcription |

## Decision (2026-09-19)

The full 6.69 GB download is NOT justified now. ASER already covers
Lexora's stated NNCES use (Whisper validation and expected-vs-actual
on Indian children's English) with prompts and labels NNCES lacks.
NNCES's unique value - longer, cleaner utterances with 10 repeats per
child and a third L1 - is worth a **pilot subset only**: one session
per speaker of `Read_Speech_Data` (500 files, ~0.65 GB) fetched with
`-f`, then Whisper + manual listening to recover the 10 prompts. Revisit
the full download only if ASER's short utterances prove insufficient
for WPM/pause calibration. `PROJECT_SPEC.md` s21 still lists NNCES as
"Whisper transcription and pronunciation-mismatch validation"; that row
should be footnoted to "pilot / secondary" if this decision stands.

## Tradeoff: original vs. pre-resampled copy

| | Original NNCES | `mirfan899/kids-speech-dataset` |
|---|---|---|
| URL | (above) | https://www.kaggle.com/datasets/mirfan899/kids-speech-dataset |
| License | CC0 | GPL-2.0 (declared by re-publisher) |
| Size | ~6.69 GB | ~984 MB (984,625,188 bytes, verified) |
| Audio | 44.1 kHz, 2-channel WAV | 16 kHz mono WAV (stated: "converted to 16000, mono channel to be used for phoneme recognition") |
| Provenance | primary source | states it is derived from NNCES v1; file listing shows 4,980 flat WAVs (`output/<spk>_<sess>_<item>.wav`) = read half only, 20 files short, no text |
| Whisper-ready | needs resampling to 16 kHz mono (Whisper resamples internally via ffmpeg, but 6.7 GB is heavy to store/process) | directly usable |

Recommendation: download the ORIGINAL CC0 corpus as the source of
record, then produce our own 16 kHz mono copies under
`data/processed/nnces/` with a documented script. Only if the 6.7 GB
download or local disk (42 GB free at time of writing) is a practical
blocker should the 984 MB re-published copy be used instead — and if
so, `data/README.md` must state that the audio came from the
re-published GPL-2.0 copy, not the CC0 original.

## Can Whisper process it directly?

Whisper (openai-whisper / faster-whisper) accepts any format ffmpeg
can decode and resamples to 16 kHz mono internally, so 44.1 kHz stereo
WAV is technically fine. For batch feature extraction (librosa
WPM/pause features) a one-time conversion to 16 kHz mono is still
recommended to cut storage ~7x and avoid repeated resampling. ffmpeg
is NOT currently installed in this environment; it will be required
for both Whisper and the conversion.

## Intended Lexora use

- Validate Whisper transcription quality on real Indian-accented
  children's English (read speech with known prompts →
  expected-vs-actual comparison).
- Tune words-per-minute, pause-count, repetition and substitution
  features on genuine child audio.
- Provide real (not synthetic) example recordings for the speech
  pipeline's tests.

## Limitations

- 50 children, single L1 (Telugu); not representative of all Indian
  accents.
- No literacy-difficulty or dyslexia labels.
- Age range 8–12 overlaps but does not fully cover Lexora's 6–10.
- Large download.

## Reproduce

Requires the Kaggle CLI (`pip install kaggle`) and an API token at
`~/.kaggle/kaggle.json` (never committed).

1. `python scripts/data/list_kaggle_files.py kodaliradha20phd7093/nonnative-children-english-speech-nnces-corpus data/metadata/nnces_file_manifest.json`
2. `python scripts/data/download_kaggle.py nnces-pilot` (resumable)
3. `python scripts/data/verify_nnces_pilot.py`

Full corpus, if ever justified:
`kaggle datasets download kodaliradha20phd7093/nonnative-children-english-speech-nnces-corpus -p data/raw/nnces --unzip`
(6.69 GB transfer, ~14 GB peak disk). Raw files are never modified.
