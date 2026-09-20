# Lexora — architecture

Governing requirements: `PROJECT_SPEC.md`. Dataset provenance: `DATASET_RESEARCH.md`, `../data/README.md`.

## 1. Overview

```
┌──────────────── frontend (React + TS + Vite + Tailwind) ────────────────┐
│ landing / login │ teacher dashboard, children, screening runner, report │
│ parent views    │ child home, practice player, progress   │ methodology │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ JSON over /api (JWT bearer)
┌───────────────────────────────▼─────────────────────────────────────────┐
│ backend/app (FastAPI)                                                    │
│  routers: auth · children · screenings · practice · progress · meta      │
│  services: analysis · scoring · practice · demo · access                 │
│  models (SQLAlchemy) · seed (demo data) · config (.env)                  │
├──────────────┬─────────────────────┬────────────────────────────────────┤
│ lexora_nlp   │ lexora_speech       │ lexora_ml                          │
│ normalize    │ audio (ffmpeg)      │ aser_features (shared train/runtime)│
│ alignment    │ transcribe (Whisper)│ reading_level (XGBoost + TreeSHAP) │
│ phonetic     │ features (fluency)  │ indicator (additive composite)     │
│ features     │ pronunciation (w2v2)│ train_reading_level · validate_rello│
└──────────────┴─────────────────────┴────────────────────────────────────┘
                 SQLite (default) or MySQL · local file storage
```

The three analysis packages are plain Python with no web dependencies, so the
training scripts, validation scripts and the API all call exactly the same code.

## 2. Screening flow and data model

A **screening session** is created with 27 tasks from `app/content.py`:

| Kind | Items | Prompt source | Response | Analysis |
|---|---|---|---|---|
| reading | 5 capital letters, 5 small letters, 5 words, 4 sentences | ASER English subtest items | examiner mark (correct / mistakes / seconds) and/or recording | ladder rule (a level failed on **examiner marks** → higher levels skipped, as in ASER); Whisper judgement is advisory and never stops the ladder; the teacher can re-mark any item on the report and the session is re-scored |
| writing | 6 word dictations + 1 sentence dictation | ASER words/sentences | typed text | `lexora_nlp.analyze_text` |
| speech | 1 passage (3 ASER sentences) | ASER sentences | recording | ffmpeg → Whisper → `speech_features` |

Entities (`app/models.py`): `users`, `children`, `consents`, `screening_sessions`,
`screening_tasks` (one table with `kind`), `screening_responses`,
`text_analysis_results`, `speech_analysis_results`, `risk_scores`,
`risk_features`, `practice_activities`, `practice_attempts`, `progress_records`.

Other session operations: `DELETE /api/screenings/{id}` discards an in-progress screening and its recordings (cascade deletes; completed screenings are kept); the report includes a `previous` block comparing the indicator, band and reading level with the child's most recent earlier screening.

Completing a session (`services/scoring.py`):

1. reading items → `session_features()` (the ASER feature vector) → `predict_reading_level()`
2. writing results aggregated; speech passage features fetched
3. `compute_indicator()` → score, band, exact contributions
4. error profile → target skills; narrative; `RiskScore` + `RiskFeature` rows; progress records

## 3. NLP layer (`lexora_nlp`)

Deterministic and explainable, no external service:

* `normalize` — case/punctuation/accents, number words.
* `alignment` — Levenshtein with backtrace at character and word level; look-alike words align as substitutions, so misspellings are not counted as omission+addition.
* `phonetic` — a compact Metaphone-style key; `phonetically_similar` marks sound-alike spellings (sed/said).
* `features.classify_word_error` — patterns: mirror-letter reversal (b/d, p/q, m/w, n/u), whole-word reversal (was/saw), letter transposition (form/from), letter omission/addition/substitution, vowel confusion, double letter dropped, phonetic spelling.
* `features.analyze_text` — word-level accuracy, WER, omission/addition/substitution/repetition counts, letter-level counts, pattern counts and per-word detail.

Validated on Birkbeck + Holbrook (`data/metadata/validation_nlp_misspellings.json`): 100% of real misspellings detected, ≥99% receive an explainable pattern, 0 false positives on correct words, ~70% of children's errors phonetically plausible.

## 4. Speech layer (`lexora_speech`)

* `audio.to_wav16k` — any browser/ASER/NNCES format → 16 kHz mono PCM via the bundled ffmpeg.
* `transcribe.WhisperTranscriber` — faster-whisper (CTranslate2, CPU int8), word timestamps, English forced, **the expected prompt is not given to Whisper** (it would bias it towards "hearing" the prompt). `DemoTranscriber` is the labelled fallback.
* `features.speech_features` — duration, recognised/expected words, ASER-style `item_is_correct` (letter names such as "bee"/"b" accepted for letters; one-edit phonetic tolerance for words; ≥75% words for sentences), energy-based long pauses (>0.5 s), words-per-minute and pauses-per-10-words for multi-word items only, Whisper per-word confidence.
* `pronunciation.py` — the **pronunciation layer**, a second, independent listener. Whisper's language model silently repairs mispronunciations ("he as a blue shit" → "he has a blue shirt"; measured on a real test recording, identical with `medium` and `large-v3-turbo`), so a phoneme recogniser with *no* language model (`facebook/wav2vec2-xlsr-53-espeak-cv-ft`, int8-quantised, ~1.4 s per passage on CPU) transcribes the sounds actually produced. They are mapped onto a small canonical phoneme set and aligned (weighted edit distance) with the CMUdict pronunciation of each prompt word (letter names for ladder letters). Indian-English realisations (v/w, t/θ, d/ð, s/z, vowel length) cost nothing; each word gets a 0–1 mismatch score and is flagged above 0.30 (0.5 for 1–2-sound words). Output: per-word flags, overall phoneme error rate, the raw IPA heard. Validated on the same 120 ASER clips as Whisper: agreement with examiners 83% on sentences (Whisper 77%), 70% on capital letters (67%), 77% on small letters (80%), 60% on single words (70%); "either recogniser passes" is ≥ Whisper at every level, so a Whisper-rejected item is rescued when its sounds matched (thresholds tuned on that sample). Feeds the indicator (`pronunciation` signal), the report, the error profile (`mispronounced` → practice words, `clear_sounds` skill) and instant feedback in read-aloud practice (`POST /api/practice/{id}/read-check`; practice audio is analysed and deleted). Optional: `PRONUNCIATION_MODEL=` disables it and everything else still works.

Validated on 120 real ASER clips (`validation_speech_aser.json`): agreement with the examiner 67% (capital letters) → 80% (small letters), 73% (words), 77% (sentences); precision 0.83–1.0, recall 0.33–0.67. Hence examiner marking is primary for the ladder and Whisper is advisory. Whisper also fails in two opposite directions on the passage: it mishears accented words (*many → money*) and silently *repairs* mispronunciations towards fluent English (*he as a blue shit → he has a blue shirt*), hiding exactly what a screener wants to see. Two mitigations: per-word confidences are stored and low-confidence words are highlighted in the report, and a teacher can **correct the transcript** to what the child actually said (`POST /api/screenings/{id}/tasks/{task_id}/transcript`); text-derived features are recomputed, audio-derived ones kept, the original recognition retained for audit, and a completed session re-scored. NNCES pilot (`validation_speech_nnces_pilot.json`): descriptive, prompt-free measures only.

## 5. ML layer (`lexora_ml`)

### Reading-level model (ASER)
* Features (`aser_features.py`): per ladder level — attempted flag, item count, accuracy, mean mistakes, mean seconds; plus class, totals, highest level attempted. Unreached levels are NaN (XGBoost native missing handling).
* Label: the ASER examiner's English reading level (Beginner / Capital letter / Small letter / word / Sentence), 4,908 real sessions.
* Model: `XGBClassifier(multi:softprob)`, held-out accuracy 0.888, macro-F1 0.877 (rule-based ladder baseline 0.747). Runtime explanation uses XGBoost's `pred_contribs` (exact TreeSHAP); training-time SHAP summary via the `shap` package.
* Ladder consistency, matched to real examiner behaviour: the predicted level is capped at the highest level attempted (true for 99.2% of ASER sessions) and is "Beginner" when no capital letter was read (95% of such sessions). Accuracy-based caps were tried and rejected because ~11% of real examiner labels exceed even a 20% rule; the chosen cap leaves held-out accuracy at 0.888.
* Also extracted from the same real data: median examiner level per school class (used as "typical for class") and median words-per-minute of correctly read sentences per class (reading-rate reference).
* Caveat (in the metadata): examiners assign the level from the same performance the features summarise, so high accuracy is expected; this validates the feature→level mapping and provides norms, and says nothing about dyslexia.

### Screening indicator (`indicator.py`)
A weighted average of 0–1 signals, renormalised over the tasks actually completed:

| Group | Signal | Weight |
|---|---|---|
| reading | level gap vs class median (0 / 1 / ≥2 levels → 0 / 0.5 / 1) | 0.25 |
| reading | letter naming errors · word reading errors · sentence errors | 0.10 · 0.10 · 0.05 |
| writing | spelling error rate · reversals/transpositions · phonetic spellings · letters omitted | 0.15 · 0.10 · 0.05 · 0.05 |
| speech | passage word mismatch · pronunciation (phoneme mismatch) · rate below class reference · long pauses | 0.08 · 0.07 · 0.03 · 0.02 |

Bands: `< 0.25` few signals · `< 0.50` some signals (may warrant closer observation) · else multiple signals. Because the score is additive, every contribution shown in the report is exact. The weights are a documented design choice, not fitted to a clinical outcome — no such data exists for this population — which is why the output is a screening indicator and not a probability of dyslexia.

### Methodological check (Rello et al.)
`validate_rello.py` trains XGBoost on the real Spanish Dytective dataset (3,644 children, 392 diagnosed) with the preprocessing documented in `data/metadata/rello_profile.md`: 5-fold CV ROC-AUC 0.855; recall 0.46 @0.5 / 0.61 @0.3; desktop→tablet transfer is poor (AUC 0.57) and is reported as such. This shows the classifier+SHAP method behaves sensibly on genuinely labelled data; it is not evidence about Lexora's indicator.

## 6. Practice generation (`services/practice.py`)

`generate_activities()` returns four validated `ActivityContent` objects (word choice, spelling dictation, read-aloud sentences, story + questions) built from the error profile: missed words, phonics word families, orientation pairs (bad/dad, was/saw), distractors shaped by the child's own patterns. `GeminiGenerator` is used only when `GEMINI_API_KEY` is set (free tier, REST via httpx, JSON schema, banned clinical terms, Pydantic validation) and falls back to `DeterministicGenerator` on any failure. Every activity records `source`. `score_attempt()` scores answers (spelling via `analyze_text`, so feedback names the pattern).

## 7. Frontend

React 19 + TypeScript + Vite 8 + Tailwind v4, Recharts, Lucide. Routes are code-split with `React.lazy` (the landing/login shell is ~235 KB gzip-73 KB; report/progress views with Recharts load on demand). `lib/api.ts` is a typed fetch wrapper; `lib/auth.tsx` holds the JWT (localStorage) and role. In child mode the screening runner uploads reading recordings in a background queue (sequential, retryable) so the child moves straight to the next item while Whisper works; server responses are merged monotonically so out-of-order replies never re-open an answered item. Teachers record ASER-style mistake counts (1–4+) for word and sentence items. Routes follow spec §6 (`/teacher/*`, `/parent/*`, `/child/*`, public `/`, `/how-it-works`, `/login`). Shared components: `ScreeningRunner` (teacher examiner mode and child mode), `ReportView`, `ProgressView`, `Practice` (list + player), `charts` (validated palette: reading `#0a9a9d`, writing `#5f4aa8`, speech `#a8760f`). Responsive: sidebar on desktop, top menu + bottom tab bar (child) on mobile.

## 8. Security and privacy (MVP level)

PBKDF2-SHA256 password hashes, HS256 JWTs (startup warning if the built-in dev key is still in use), role checks (`require_roles`) and row-level access (`services/access.py`: teachers see their children, parents their linked children, child accounts only themselves; only teachers/parents generate practice). Upload validation: type allow-list, 15 MB cap, empty-file rejection; recordings go through `services/storage.py` (local backend now, S3-shaped interface). Audio analysis (ffmpeg + Whisper) runs in a worker thread *before* any row is written, so it blocks neither the event loop nor SQLite's single write lock; SQLite runs in WAL mode with a 30 s busy timeout, which is what lets the child-mode background upload queue and a teacher's actions overlap safely (verified with 3 concurrent uploads + 1 text submission). Consent records on child creation. Secrets only via `.env`.

## 9. Demo mode and graceful degradation

| Missing | Behaviour |
|---|---|
| Whisper model | demo transcriber, `engine=demo`, session `mode=demo`, badge in UI |
| Model artifact | rule-based ladder level, `engine` says so |
| Gemini key | deterministic generator (default) |
| Database config | SQLite file created automatically |
| Microphone / child | teacher's **Fill with demo answers** |

## 10. Deviations from PROJECT_SPEC.md (deliberate, documented)

| Spec | Implementation | Why |
|---|---|---|
| §4 shadcn/ui | small hand-written component set (`components/ui.tsx`) on Tailwind | fewer moving parts for a BCA-scale codebase; Lucide + Recharts used as specified |
| §4 MySQL | SQLite by default, MySQL via `DATABASE_URL` (pymysql included, column lengths sized for MySQL) | zero-setup demo; the spec's target is one env var away |
| §7 `reading_tasks` / `writing_tasks` / `speech_tasks` | one `screening_tasks` table with `kind` | identical columns; avoids triplicating the schema |
| §17 build order | NLP/ML/speech built before the frontend | the analysis code is what the UI displays; every phase stayed runnable |
| §21 NNCES "Whisper transcription and pronunciation-mismatch validation" | prompt-free measures only | the uploaded corpus has no prompts or transcripts (verified); spec §21 already records this |
| §10 "forced alignment must NOT be required" / deck "MFA / wav2vec2+CTC forced alignment" | no forced aligner; instead a phoneme recogniser + accent-tolerant phoneme alignment (pronunciation layer) | gives word-level mispronunciation flags without an aligner or phoneme timestamps; validated on ASER clips (`validation_speech_aser.json`, `phoneme_layer`) |

## 11. Limitations

* No dataset provides dyslexia labels for Indian children's English; the indicator's weights are a design choice, the model estimates *reading level*, and no clinical validity is claimed or established.
* ASER audio is phone-quality AMR-WB; Whisper is unreliable on isolated letters (recall 0.33 on capitals), so letter items rely on examiner marking. On passages Whisper both mishears accented speech and auto-corrects mispronunciations; the pronunciation layer counters the second problem but is itself noisy on phone-quality children's audio (see the phoneme_layer figures in the validation JSON), and dictionary pronunciations are American English, so its flags are advisory and the teacher can still correct the transcript.
* The pronunciation model needs ~1.2 GB of downloaded weights and ~1 GB RAM (int8, in-place quantised) in addition to Whisper — the backend measures ≈2.6 GB with both models loaded; on small machines set `PRONUNCIATION_MODEL=` and the feature is skipped. Models preload in a background thread at startup (`PRELOAD_MODELS`).
* Phoneme flags on isolated letters are the layer's weakest case (70% agreement), so the report shows sound flags only for words and sentences; the validated "either recogniser passes" rescue still applies to letters.
* NNCES contains audio only; it supports prompt-free measures and nothing else. Prompts were deliberately not reconstructed.
* Rello results do not transfer across test versions, underlining that such classifiers are instrument-specific.
* The demo child's history is generated through the real pipeline from scripted responses; it is labelled and is not evidence.
* Reading-rate references come from 4–6-word ASER sentences, so passage WPM is only loosely comparable.
* Single-server, single-process design; audio analysis is synchronous (a few seconds per clip).
