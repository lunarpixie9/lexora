# ASER Dataset Profile (Pratham)

Status: DOWNLOADED and VERIFIED (2026-09-19)
Raw location: `data/raw/aser/` (never modified)
Processed location: `data/processed/aser/`
Scripts: `scripts/data/verify_aser.py`, `scripts/data/inspect_aser.py`,
`scripts/data/extract_aser_samples.py`

## Source

- Publisher: Pratham / ASER Centre, India
- Paper: Agarwal, Gupchup, Baghel. "A Dataset for Measuring Reading
  Levels in India at Scale." ICASSP 2020. doi:10.1109/ICASSP40776.2020.9053380
- Repository: https://github.com/PrathamOrg/ASER-Dataset
- License: CC BY-NC-SA 4.0 (stated in README.md of the repository)
- Access: public, no account required

## How it was obtained

`git clone` failed twice on connection resets (large pack). The GitHub
ZIP archive (`codeload.github.com/.../zip/refs/heads/master`,
803,230,228 bytes) was downloaded with curl and extracted. Every
extracted file was then verified against the GitHub tree API manifest
(`data/metadata/aser_github_tree.json`) by size AND git blob SHA-1:

- manifest files: 5,318 — local files: 5,318
- missing: 0, extra: 0, size mismatches: 0, SHA mismatches: 0
- total bytes: 848,589,712 (848.6 MB)

Result file: `data/metadata/aser_verification.json`.

## Directory structure (verified)

```
data/raw/aser/
  README.md                      dataset description (7.5 KB)
  Complete Vocabulary.xlsx       per-item clip counts and total durations (Hindi/Marathi/English sheets)
  howtotestreadinginhindi.pdf    ASER test administration guide
  Sample Sets/Hindi.pdf, Marathi.pdf   the printed test sheets (51 MB)
  Baseline Solution/             authors' notebooks + english.csv, english_distance.csv (24.9 MB)
  Data/
    Hindi RJ/    1,863 zips  288.4 MB   (Rajasthan)
    Hindi UP/    2,096 zips  276.9 MB   (Uttar Pradesh)
    Marathi MH/  1,342 zips  207.2 MB   (Maharashtra)
```

Each `Data/<region>/<id>.zip` is one child's test session and contains
exactly one `.json` file plus the session's audio clips.

- 5,301 session ZIPs, 772,431,842 bytes; `zipfile.testzip()` clean on all
- inside the ZIPs: 81,338 audio files + 5,301 JSON files; no other file types
- 8 audio files across 5 ZIPs are not referenced by their JSON
  (`4993, 1069, 865` ×2 each; `337, 342` ×1) — kept, but unlabelled

## Audio format (verified with mutagen and ffmpeg)

The clips are named `.mp3` but are NOT MP3. Byte signature is
`ftyp3gp4` on every sampled file (2,037 of 2,037 sampled). ffmpeg
reports, for every probed clip:

```
Audio: amr_wb (sawb), 16000 Hz, mono, 13 kb/s   (3GPP container)
```

i.e. Android MediaRecorder default output — AMR-WB speech codec at
16 kHz mono. Consequences:

- ffmpeg decodes AMR-WB natively; Whisper (which shells out to ffmpeg)
  and librosa (via audioread/ffmpeg) can consume the clips directly.
  Plain `wave`/`soundfile` cannot. ffmpeg is therefore a hard
  dependency for using this data (a bundled binary via
  `imageio-ffmpeg` worked; no system ffmpeg was installed).
- 16 kHz mono already matches Whisper's input rate, so no resampling
  loss.
- AMR-WB is a narrow/wide-band speech codec at 13 kb/s: fine for ASR
  and fluency timing, but acoustic-quality features (e.g. spectral
  detail above ~7 kHz) are not meaningful.
- mutagen reports sample rate 0 for 26,542 clips; ffmpeg confirms all
  are 16 kHz mono — this is a mutagen header-parsing gap, not a data
  fault. Durations from mutagen and ffmpeg agree exactly on all
  cross-checked clips.

Totals: 81,339 clips probed OK, 0 unreadable, 445,379 s = **123.7 hours**.
Clip length range 0.12 s – 420.9 s.

| Level | n clips | median s | p90 s |
|---|---|---|---|
| CL English capital letter | 22,013 | 1.84 | 3.92 |
| SL English small letter | 17,941 | 1.72 | 3.32 |
| W English word | 14,612 | 2.34 | 6.16 |
| S English sentence | 6,225 | 4.28 | 10.94 |
| L native letter | 6,773 | 2.54 | 5.80 |
| WD native word | 5,976 | 3.34 | 7.94 |
| P native paragraph | 4,519 | 12.88 | 28.62 |
| ST native story | 3,105 | 43.12 | 84.34 |

Eight representative clips were converted to 16 kHz/16-bit mono WAV
under `data/processed/aser/samples/` (manifest `samples.csv`) for
listening; headers verified with the `wave` module.

## Session JSON (verified)

Keys present in all 5,301 sessions: `ageGroup`, `date`, `deviceID`,
`nativeProficiency`, `sequenceList`, `studClass`.
`englishProficiency` is present in 5,047 sessions and absent in 254
(the English subtest was optional).

| Field | Values observed (count) |
|---|---|
| `ageGroup` | 7-10 years (1,648), 10-12 years (1,616), 12-15 years (1,133), 5-7 years (756), less than 5 years (117), 15-18years (31) |
| `studClass` | 1–8 dominate (603–798 each); 9–12 rare (28 total); "select class" placeholder (25) |
| `nativeProficiency` | Story (2,353), Letter (985), Paragraph (878), Word (594), Beginner (419), "Test was not complete" (72) |
| `englishProficiency` | Small letter (1,468), Sentence (1,309), word (850), Beginner (737), Capital letter (622), "Test was not complete" (61), key absent (254) |
| `date` | all in 2019 (Aug–Dec observed), IST timestamps |

Note the value spellings are inconsistent (`word` lower-case,
`Small letter`, `15-18years` without space) — normalise on load.

**Age is only available as a bracket**, never as an exact age. 2,404
sessions (45%) fall in the 5-7 / 7-10 brackets that overlap Lexora's
6–10 target. Gender is not recorded.

## Item-level fields (`sequenceList`, verified)

81,658 items total. 81,552 have exactly the documented keys
`isCorrect`, `noOfMistakes`, `que_id`, `que_text`, `recordingName`.
Variants: 84 items use `startTime`/`endTime` and have no recording;
11 lack `noOfMistakes`; 9 use `correct` instead of `isCorrect`; 2
have extra annotation fields (`groundTruthDescription`,
`noiseDescription`, `remarks`).

`que_id` format `<lang>_<sample>_<level>_<n>`:

- `lang`: `HI` (Hindi test), `MR` (Marathi test). 311 items use `MH`
  (a Maharashtra-region variant of `MR`, seen only in Marathi MH) and
  175 use level `Cl` instead of `CL` — normalise.
- `level`: CL/SL/W/S are the **English** subtest (letters, words,
  sentences); L/WD/P/ST are the native-language subtest.
- `que_text`: the exact text shown to the child. English items draw
  from a small fixed pool: 24 capital letters, 23 small letters, 28
  words (e.g. cat, sun, man, red, fan), 22 sentences (e.g.
  "Where is your house?", "What is the time?", "I like to read.").
  Full list with clip counts in `Complete Vocabulary.xlsx`.
- `isCorrect`: boolean, present on every item.
- `noOfMistakes`: stored as a string. 49,861 "0", 12,139 "1", 5,682
  "2", 3,639 "3", 2,918 "4", 4,078 "5", a few "6"–"10". Also
  **3,163 items carry the value "200"**, only at sentence/paragraph/
  story levels and 83% with `isCorrect=false`. The README does not
  explain this; it looks like a sentinel or app default rather than a
  real count. Treat "200" (and "00"/"01"/"100" oddities, ~130 items)
  as non-numeric/unknown until clarified — do not use as a count.
  Per the README, for letter/word levels the field holds the section
  total, not a per-item value.
- `recordingName`: matches an audio file in the ZIP for 81,339 items;
  84 items have no recording name; 235 name a file that is not in the
  ZIP (concentrated in a handful of sessions, 21 each).

Sessions with at least one English item: 5,010; with at least one
English **sentence** item: 1,857 (6,225 sentence clips).

## Baseline Solution extras (verified)

`Baseline Solution/english.csv` (5,319 rows) and `english_distance.csv`
are the authors' outputs for the English sentence items: session/item
id, ground-truth sentence, `IsCorrect` label, an ASR transcript (506
empty), ASR confidence, and (distance file) a similarity score between
transcript and ground truth. 1,572 distinct children, 22 sentences.
This is directly the "expected text vs. transcribed text" pairing
Lexora's speech comparison produces, and can serve as a reference
point for our own Whisper-based transcripts.

## What Lexora can genuinely extract

| Lexora need | ASER provides | Caveat |
|---|---|---|
| Real Indian children's read-aloud audio | yes, 123.7 h, 5,301 children | AMR-WB 3GP; needs ffmpeg |
| English reading audio | letters, words, short sentences (~60.8k clips) | no English paragraphs/stories |
| Expected text for each clip | `que_text` | fixed small pool of prompts |
| Correct / incorrect label per item | `isCorrect` | examiner judgement, binary |
| Error count per item | `noOfMistakes` for S/P/ST | "200" sentinel; section totals for letters/words |
| Reading-level label per child | native 5-level, English 5-level | coarse, not per-error-type |
| Age | bracket only | no exact age, no gender |
| Reading speed / pauses | derivable from audio + text | must be computed by us |
| Error types (omission/substitution/reversal) | NOT provided | must be derived by comparing transcript with `que_text` |
| Dyslexia / learning-difficulty label | NOT provided | this is a reading-level survey, not a clinical dataset |
| Hindi-English code-mixing | not as such — separate Hindi and English subtests | |

## Intended Lexora use

1. Ground truth for the speech pipeline: run Whisper on the English
   sentence/word clips, compare to `que_text`, and check that our
   substitution/omission/WER features align with the examiner's
   `isCorrect` label (and with the authors' baseline transcripts).
2. Real timing distributions (WPM, pauses) for Indian children per
   reading level, to calibrate fluency thresholds instead of guessing.
3. Realistic demo/test audio for the speech task (with attribution).
4. Reading-level labels as a weak proxy target when exploring
   feature usefulness — clearly not a dyslexia label.

## Limitations

- No dyslexia or screening labels of any kind.
- English material is very short (max one sentence) and from a fixed
  pool; no connected-text English reading.
- Field recording quality (2019 Android phones, rural classrooms);
  AMR-WB codec.
- Age brackets only; Hindi/Marathi L1 children from three states.
- Non-commercial license; attribution and share-alike required.
