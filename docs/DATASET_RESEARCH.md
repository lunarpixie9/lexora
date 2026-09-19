# Lexora Dataset Research

Research date: 2026-09-19
Scope: identify REAL, practically-accessible datasets to support Lexora's
detection, ML risk-scoring, speech, and generation components, within a
~2-week BCA project timeline. Synthetic data is NOT proposed as a primary
dataset anywhere in this document. (PROJECT_SPEC.md Sections 11 and 21
now make real datasets the primary data source, with synthetic data
subordinate to them.)

---

## Post-verification update (2026-09-19, after download)

This document is the pre-download research record. The following
findings from the actual downloads supersede the corresponding
statements below (details in `data/README.md` and `data/metadata/`):

- **NNCES contains audio files only.** The complete 10,000-file Kaggle
  listing shows `.wav` files and nothing else — no prompt text, no
  transcripts, no metadata files, despite the page's claim of
  "word level transcription". NNCES therefore cannot support
  expected-vs-actual comparison; it is reclassified as a SECONDARY,
  prompt-free speech-validation source, and only a pilot (500
  read-speech WAVs, one session per speaker) was downloaded. Prompts
  are not to be reconstructed from the audio.
- **ASER is the primary speech/reading dataset**: 60,966 English clips
  (47.3 h) with prompt text (`que_text`) and examiner correctness
  labels, from 5,010 children — it covers the use originally assigned
  to NNCES.
- **kids-speech-dataset (mirfan899)** is the read-speech half of NNCES
  only (4,980 flat WAVs, 20 short), also with no text; it is not a
  useful substitute.
- **Rello et al.** downloaded and verified (3,644 + 1,395 rows; counts
  match the paper). Two data-quality issues need preprocessing: some
  `Accuracy`/`Missrate` cells have lost their leading `0.`, and the
  tablet file uses literal `NULL`. It remains a methodological
  validation source only.
- All four datasets validate individual Lexora components; none
  establishes clinical or diagnostic validity.

---

## Executive Summary

Four real datasets are genuinely practical for this project, all
downloadable within minutes on a normal laptop with no institutional
approval and no payment:

1. **ASER Dataset (Pratham)** — the single best fit for Lexora's Indian
   context. Real Indian children (ages 6–14) reading Hindi, Marathi, and
   English aloud, with expert-assigned proficiency labels and per-item
   mistake counts, distributed as a public GitHub repo under
   CC BY-NC-SA 4.0. No signup needed.
2. **NNCES Corpus / kids-speech-dataset (Kaggle)** — 50 Indian (Telugu
   L1) children aged 8–12 reading and speaking English, CC0, ~20 hours,
   with a pre-resampled 16kHz mono version ready for Whisper.
3. **Birkbeck + Holbrook misspelling corpora** — real spelling errors,
   the Holbrook portion specifically from UK schoolchildren's own
   writing. Direct download, no signup, no license paywall. Ideal for
   sanity-checking the edit-distance/phonetic spelling-error engine
   against real error patterns.
4. **"Predicting Risk of Dyslexia" dataset (Kaggle, Rello et al.)** —
   3,644 real participants (392 with a dyslexia diagnosis), CC BY 4.0,
   with 196 numeric behavioral features (clicks, hits, misses, accuracy)
   from a gamified screening test. The task itself is in **Spanish**,
   so it cannot supply English text — but it is a genuine, labeled,
   real-world dyslexia classification dataset that can validate that an
   XGBoost pipeline built on this kind of feature shape actually
   separates dyslexic vs. non-dyslexic populations.

A fifth, the **Dyslexia Handwriting Dataset (Kaggle)**, is real (it
includes actual handwriting from dyslexic primary-school children in
Penang, Malaysia, mixed with NIST SD19 and a Kaggle A–Z alphabet set)
and directly downloadable, but its Kaggle-declared license is
**"Unknown"** — usable for an academic prototype under Kaggle's
non-commercial research norms, but this should be stated explicitly in
the project report rather than assumed.

No single dataset covers reading + writing + speech + dyslexia labels
for Indian English children — that dataset does not appear to exist in
an accessible form. The realistic strategy (see below) is to combine
several narrow real datasets, each covering one Lexora component, and
to keep the project-spec's synthetic dataset for the end-to-end
XGBoost demo, now cross-checked against real data instead of invented
in isolation.

---

## Dataset Comparison

| Dataset | Modality | Children? | Language | Participants | Labels | License | Access | Size | Practicality | Lexora Use |
|---|---|---|---|---|---|---|---|---|---|---|
| ASER Dataset (Pratham) | Audio + JSON | Yes (6–14) | Hindi, Marathi, English | 5,301 | Reading-level proficiency, per-item correct/incorrect, mistake counts | CC BY-NC-SA 4.0 | A — public GitHub, no signup | 5,301 zip bundles; 848.6 MB total repo (772.5 MB in Data/) — verified via GitHub tree API on 2026-09-19 | High | Speech analysis, reading fluency, Indian-context validation |
| NNCES Corpus (Kaggle) | Audio (.wav) only — **verified after download: no transcripts included** | Yes (8–12) | English (L1 Telugu, Indian) | 50 | Read vs. spontaneous speech split (folder names); no transcripts | CC0 | B — Kaggle account | ~20 hours audio | High | Speech analysis, Indian English pronunciation |
| kids-speech-dataset (Kaggle, mirfan899) | Audio (16kHz mono .wav) | Yes (8–12) | English (Indian, L1 Telugu) | 50 (derived from NNCES) | Same as NNCES | GPL-2.0 | B — Kaggle account | ~984MB | High | Pre-cleaned Whisper-ready Indian children's speech |
| Birkbeck + Holbrook misspelling corpora | Text (misspelling→target pairs) | Holbrook: yes (UK secondary schoolchildren); Birkbeck: mixed | English (British/US) | Holbrook: 1,200 target words / 1,791 errors; Birkbeck: 6,136 words / 36,133 errors | Misspelling, target word, frequency | CC BY-NC-SA 3.0 (OTA copy); direct mirror unlicensed-unverified | A — direct download, no signup | <5MB (plain text) | High | Validate spelling-error / edit-distance / phonetic engine against real errors |
| Predicting Risk of Dyslexia (Kaggle, luzrello) | Tabular (196 numeric features) | Yes/teens (7–17) | **Spanish** (task language) | 3,644 (+1,395 validation set) | Binary dyslexia diagnosis | CC BY 4.0 | B — Kaggle account | Small (CSV, low MB) | High (as classifier reference) | Validate XGBoost/SHAP pipeline shape on real diagnosed labels; NOT a source of English text |
| Dyslexia Handwriting Dataset (Kaggle, drizasazanitaisa) | Images (handwritten letters) | Partially (real dyslexic primary-school children in Penang, Malaysia, mixed with NIST SD19 adult/general handwriting) | N/A (letters/alphabet, not English prose) | 3,600 writers (NIST SD19 portion) + Malaysian schoolchildren subset | Normal / Reversal / Corrected | **Unknown** (Kaggle-declared) | B — Kaggle account | ~96MB | Medium (license caveat) | Optional illustrative reversal-detection examples; not core NLP pipeline |
| Common Voice (Indian English subset) | Audio + metadata | No (general population, mostly adults) | English (Indian accent) | Thousands of speakers | Accent, age, gender metadata | CC0 | A — direct download | Tens of GB for full release; accent subset filterable, smaller | Medium | Supplementary Whisper/ASR robustness check on Indian-accented English (not child-specific) |
| MyST Children's Speech Corpus | Audio + transcripts | Yes (grades 3–5) | English (US) | ~1,300 | Partial transcriptions | CC (non-commercial) via request | C — request form + data use agreement | ~400 hours (very large) | Low for 2-week timeline | Not recommended — too large, US non-Indian accent, and access takes time to arrange |
| CMU Kids Corpus (LDC) | Audio | Yes (6–11) | English (US) | 76 | Read-aloud utterances | LDC license | D — $200 + $30 s/h, LDC membership | Unverified | Low | Rejected — paid |
| CSLU Kids' Speech (LDC) | Audio | Yes (K–Grade 10) | English (US) | 1,100 | Spontaneous + prompted | LDC license | D — paid/LDC | Unverified | Low | Rejected — paid |
| ETDD70 Eye-Tracking Dyslexia Dataset | Eye-tracking time series | Yes (9–10) | Czech | 70 | Dyslexic/non-dyslexic | Open (Zenodo) | A (access only) | Unverified | Low (wrong modality for Lexora) | Rejected — no eye-tracking pipeline in Lexora; Czech language |
| H1 Children's Writing Corpus (LDC) | Text | Yes (7–11) | German | 88 | Spelling-error categories | LDC license | D — LDC agreement | Unverified | Low | Rejected — restricted + wrong language |
| Samrómur Children | Audio | Yes (4–17) | Icelandic | 3,175 | Transcripts | CC BY 4.0 | A (access only) | 131 hours | Low (wrong language) | Rejected — Icelandic, irrelevant to English NLP |
| Synthetic Dyslexia Handwriting Dataset (Kaggle/Zenodo) | Images | N/A | N/A | N/A | Normal/Reversal/Corrected | CC (Zenodo) | A | Unverified | N/A | Rejected — explicitly synthetic, not real |
| Paradis bilingual children's speech (Kaggle/CHILDES) | Audio + .cha transcripts | Yes | English (L2 learners, Canada) | 25 | Naturalistic conversation | CHILDES/TalkBank terms (unverified exact license on Kaggle mirror) | B/C — CLAN tool recommended for .cha | Unverified | Medium-low | Optional reference only — naturalistic talk, not reading-aloud; needs CLAN or manual .cha parsing |

---

## Detailed Evaluation

### ASER Dataset (Pratham / ASER Centre)

- **Source:** Pratham (India's largest education NGO) and the ASER
  Centre, published alongside the ICASSP 2020 paper "A Dataset for
  Measuring Reading Levels in India at Scale" (Agarwal, Gupchup,
  Baghel).
- **Official URL:** https://www.asercentre.org/ (context on the ASER
  survey methodology)
- **Download URL:** https://github.com/PrathamOrg/ASER-Dataset
  (verified public, non-empty repository; confirmed via GitHub API and
  direct file listing during this research)
- **License:** CC BY-NC-SA 4.0 (stated in repo README)
- **Access requirements:** None. Public GitHub repo, `git clone` or ZIP
  download. No account, no application.
- **Participants:** 5,301 children
- **Age:** 6–14 years
- **Language:** Hindi, Marathi, and English (English is tested as a
  secondary subtest — capital letters, small letters, words, sentences
  — within each child's session; there is no separate "English-only"
  region folder)
- **Modality:** Audio clips (per-question recordings) + JSON metadata
  per child session
- **Labels:** `nativeProficiency` and `englishProficiency` (5-level
  scale: Beginner/Letter/Word/Paragraph/Story for native language;
  Capital Letter/Small Letter/Word/Sentence for English), plus
  per-question `isCorrect` and `noOfMistakes` fields, and the exact
  question text read.
- **File format:** One ZIP per child (verified sizes 27KB–153KB each
  in the "Hindi RJ" folder), each containing MP3 audio clips and one
  JSON file with the session's proficiency labels and error counts.
- **Size:** 848.6 MB for the whole repository, of which 772.5 MB is
  the 5,301 per-child ZIPs under `Data/` (Hindi RJ 288.4 MB / 1,863
  files; Hindi UP 276.9 MB / 2,096 files; Marathi MH 207.2 MB / 1,342
  files). The remainder is the baseline-solution notebooks (24.9 MB)
  and two sample-set files (51.1 MB). Verified from the GitHub tree
  API on 2026-09-19 (an earlier estimate of 300–500 MB was too low).
- **Preprocessing:** Minimal — unzip per child, parse JSON, load MP3.
  Straightforward with Python's `zipfile` and `json` modules.
- **Lexora use:** This is the strongest real-world match for Lexora's
  speech + reading-fluency detection layer, and specifically for the
  "Indian English/Hindi-English" requirement in the project spec's
  Problem section. The `noOfMistakes` and `isCorrect` fields are close
  analogues to Lexora's own omission/substitution/error-count features,
  making this dataset usable both to sanity-check feature extraction
  logic and to illustrate real (not invented) Indian children's reading
  error patterns in the report.
- **Advantages:** Real Indian children, real reading-aloud audio, real
  expert labels, English included, no access friction, modest size.
- **Limitations:** English portion is limited to capital/small
  letters, words, and sentences (no full story-level English passages,
  since story-level testing is only done in the child's native
  language). Labels are coarse proficiency levels, not fine-grained
  error-type tags (no explicit reversal/substitution/omission
  category — only a mistake count). Audio quality reflects a 2019
  Android app field deployment (variable microphone conditions).
  Non-commercial license only (CC BY-NC-SA), which is compatible with
  an academic project but would need re-licensing for any commercial
  use.

### NNCES Corpus — Non-Native Children English Speech Corpus (Kaggle)

- **Source:** Kaggle user kodaliradha20phd7093 (PhD researcher upload)
- **Official/Download URL:**
  https://www.kaggle.com/datasets/kodaliradha20phd7093/nonnative-children-english-speech-nnces-corpus
- **License:** CC0: Public Domain (verified via the dataset's
  schema.org metadata)
- **Access requirements:** Free Kaggle account (simple registration —
  email or Google sign-in); no institutional approval.
- **Participants:** 50 children (25 female, 25 male)
- **Age:** 8–12 years
- **Language:** English, spoken by native Telugu (Indian regional
  language) speakers learning English as a second language
- **Modality:** Audio (.wav, 44.1kHz, 16-bit, dual channel, recorded
  via the SurveyLex platform)
- **Labels:** Read speech vs. spontaneous speech split; the page
  claims word-level transcription for the spontaneous portion.
  **Verified after download (2026-09-19): the uploaded corpus contains
  only `.wav` files — no transcripts, prompts or metadata.**
- **File format:** WAV
- **Size:** ~20 hours of audio total (10,000 utterances: 5,000 read +
  5,000 spontaneous)
- **Preprocessing:** Straightforward — standard WAV loading;
  resampling to 16kHz needed for Whisper (a pre-resampled version
  already exists, see next entry).
- **Lexora use (revised after verification):** secondary,
  prompt-free speech validation — duration, speech-rate proxies, pause
  statistics and Whisper robustness on Telugu-L1 Indian English.
  Expected-vs-actual and pronunciation-mismatch validation are done
  with ASER, which has prompt text and labels.
- **Advantages:** CC0 (no restriction at all), real Indian children,
  real English speech, includes both read and spontaneous speech,
  manageable size for a laptop.
- **Limitations:** Only 50 children from one linguistic background
  (Telugu L1) — not nationally representative of India's accent
  diversity. No dyslexia or literacy-difficulty labels — this is a
  pronunciation/ASR dataset, not a screening dataset.

### kids-speech-dataset (Kaggle, mirfan899)

- **Source:** Derived/re-published version of the NNCES corpus above
- **Download URL:**
  https://www.kaggle.com/datasets/mirfan899/kids-speech-dataset
- **License:** GPL-2.0 (as declared on Kaggle) — note this differs
  from the CC0 source; the re-publisher applied their own license to
  the derived/resampled files. Treat the underlying audio as CC0-origin
  but respect the GPL-2.0 terms attached to this specific redistributed
  package.
- **Access requirements:** Free Kaggle account.
- **Participants / Age / Language:** Same as NNCES (50 children, 8–12,
  Indian English).
- **Modality:** Audio, pre-converted to 16kHz mono — ready for Whisper
  and most ASR/feature-extraction pipelines without a resampling step.
- **File format:** WAV, zipped
- **Size:** ~984MB (verified via Kaggle dataset metadata)
- **Preprocessing:** Essentially none needed — this is the
  "already prepared" version of NNCES.
- **Lexora use:** Practical drop-in audio source for early speech
  pipeline development and testing, before/alongside collecting any
  of the app's own demo recordings.
- **Advantages:** No resampling work required; same real Indian
  children's speech as NNCES.
- **Limitations:** Same content limitations as NNCES (only 50
  children, one L1 background); GPL-2.0 attribution should be kept in
  project documentation.

### Birkbeck and Holbrook Misspelling Corpora

- **Source:** Compiled by Roger Mitton, Birkbeck, University of London
- **Official URL:** https://titan.dcs.bbk.ac.uk/~ROGER/corpora.html
  (also archived at Oxford Text Archive:
  https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/0643)
- **Download URL:** Direct `.dat` file downloads from the Birkbeck
  mirror above (`birkbeck.dat`, `holbrook-missp.dat`,
  `holbrook-tagged.dat`, plus `aspell.dat` and `wikipedia.dat`)
- **License:** CC BY-NC-SA 3.0 (stated on the Oxford Text Archive
  record); the direct Birkbeck mirror does not restate a license on
  the page itself — treat as governed by the same CC BY-NC-SA 3.0
  terms as the archival copy, and cite Roger Mitton/Birkbeck per
  academic norms.
- **Access requirements:** None — no signup on the direct mirror.
- **Participants:** Birkbeck: 6,136 target words / 36,133 misspellings
  from a mix of native English schoolchildren, university students,
  and literacy students. Holbrook specifically: 1,200 target words /
  1,791 misspellings, sourced from actual writing samples of UK
  **secondary-school children**, published in the 1964 book "English
  for the Rejected" (David Holbrook).
- **Age:** Holbrook: UK secondary-school age (roughly 11–16); Birkbeck:
  mixed ages, not exclusively children.
- **Language:** British/American English
- **Modality:** Plain text (misspelling → target word, with error
  frequency)
- **Labels:** Target word, observed misspelling, frequency count
- **File format:** Plain text, Birkbeck-style format (`$correctword`
  followed by misspellings)
- **Size:** A few hundred KB total across all files — trivial to
  process on any laptop.
- **Preprocessing:** Minimal parsing of a simple delimited text
  format; no special libraries required.
- **Lexora use:** This is real evidence of how English speakers
  (including real UK schoolchildren for the Holbrook subset)
  actually misspell words. It is ideal for validating and tuning
  Lexora's edit-distance/Levenshtein and phonetic-comparison spelling
  engine against genuine error patterns (e.g. checking that the engine
  correctly flags realistic substitution/omission/phonetic errors
  rather than only synthetic ones).
- **Advantages:** Instant access, tiny size, real error data, directly
  supports the NLP detection layer's spelling-error features with zero
  infrastructure needed.
- **Limitations:** Not Indian English; not annotated for
  dyslexia/letter-reversal specifically (Holbrook errors are general
  misspellings, not dyslexia-diagnosed); no audio or writing-sample
  images, just error/target word pairs; some content is old (1964
  Holbrook material) so vocabulary may feel dated.

### Predicting Risk of Dyslexia — Dytective Gamified Test Dataset (Kaggle)

- **Source:** Rello, Baeza-Yates et al., "Predicting risk of dyslexia
  with an online gamified test," PLOS ONE, 2020
- **Official URL:** https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0241687
- **Download URL:** https://www.kaggle.com/datasets/luzrello/dyslexia
  (archived DOI: https://doi.org/10.34740/kaggle/dsv/1617514)
- **License:** CC BY 4.0 (verified via Kaggle schema.org metadata and
  the PLOS ONE article's open-access license)
- **Access requirements:** Free Kaggle account.
- **Participants:** 3,644 (392 with a dyslexia diagnosis, 3,252
  without); a second validation set of 1,395 participants is also
  described in the paper.
- **Age:** 7–17 years
- **Language:** **Spanish** — the underlying gamified test ("Dytective")
  is administered in Spanish (reviewed for neutrality across Spain,
  Chile, and Argentina Spanish variants). This is NOT an English-text
  dataset.
- **Modality:** Tabular/behavioral — not audio, not raw text
- **Labels:** Binary dyslexia diagnosis (clinically informed, not
  self-reported)
- **Features:** 196 total — 4 demographic (gender, native-language
  status, language-subject performance, age) + 192 performance features
  derived from 32 test questions (6 measures per question: Clicks,
  Hits, Misses, Score, Accuracy, Missrate)
- **File format:** CSV
- **Size:** Small (tabular CSV, low single-digit MB)
- **Preprocessing:** Minimal — standard tabular preprocessing
  (already reasonably clean per the published methodology).
- **Lexora use:** This is the one dataset in this research that
  actually provides a real, clinically-labeled binary dyslexia
  classification target with a rich numeric feature set — structurally
  very close to what Lexora's XGBoost risk-scoring layer is designed
  to consume (rate/count/accuracy-style features → binary/risk
  output). It is valuable as a **methodological validation set**: a
  team can train/evaluate an XGBoost + SHAP pipeline on this real
  labeled data to demonstrate the modeling approach genuinely
  separates dyslexic from non-dyslexic profiles, independent of the
  project's own synthetic training set.
- **Advantages:** Real diagnosed participants, permissive CC BY 4.0
  license, no cost, already-engineered numeric features, directly
  usable with `pandas` + `xgboost` + `shap` with no extra tooling.
- **Limitations:** **The task and feature semantics are Spanish-language
  and Dytective-specific** — the actual click/hit/miss features do not
  correspond one-to-one to Lexora's own
  spelling/reversal/omission/WPM features, and none of the content can
  be reused as English reading/spelling material. It must be framed
  in the report as a real-world reference/validation dataset for the
  *classifier methodology*, not as a source of Lexora's own English
  training features or text content.

### Dyslexia Handwriting Dataset (Kaggle, drizasazanitaisa)

- **Source:** Dr. Iza Sazanita Isa; combines NIST Special Database 19,
  a Kaggle "A-Z Handwritten Alphabets" dataset, and real handwriting
  samples from dyslexic primary-school children at a school in
  Seberang Jaya, Penang, Malaysia.
- **Official URL / Download URL:**
  https://www.kaggle.com/datasets/drizasazanitaisa/dyslexia-handwriting-dataset
- **License:** **Unknown** (this is the license Kaggle itself displays
  for the dataset — verified via the page's schema.org metadata, which
  explicitly returns `"license":{"name":"Unknown"}`). It is widely
  reused in published research (multiple arXiv/journal papers cite it),
  and Kaggle's platform terms permit non-commercial research use, but
  there is no clear redistribution license, so this should be
  explicitly disclosed in the project report rather than assumed to be
  public domain or CC-licensed.
- **Access requirements:** Free Kaggle account.
- **Participants:** The NIST SD19 component alone covers 3,600
  writers (general population, not children, not dyslexic); the
  dyslexia-specific "Reversal"/"Corrected" labels come from the real
  Malaysian primary-school children subset (exact participant count for
  that subset not stated on the dataset page — unverified).
- **Age:** Primary-school age for the real dyslexic-children subset
  (unverified exact range); NIST SD19 spans a general adult/writer
  population.
- **Language:** Not prose-based — isolated uppercase/lowercase letters,
  not connected English text.
- **Modality:** Images (scanned/photographed handwritten letters)
- **Labels:** Normal / Reversal / Corrected (three classes)
- **File format:** ZIP of image files
- **Size:** ~96MB (verified via Kaggle metadata: 100,851,673 bytes)
- **Preprocessing:** Standard image dataset handling; classes are
  already organized by folder per common usage reports.
- **Lexora use:** Optional supporting material for the "letter
  reversals" detection theme — useful as illustrative figures in the
  project report/demo showing what real reversal handwriting looks
  like, or as an optional bonus computer-vision module. It is **not**
  a fit for Lexora's core NLP pipeline, which operates on typed/OCR'd
  text via rule-based reversal detection (e.g. b/d, p/q character
  confusion in text), not on raw handwriting images.
- **Advantages:** Small download, no special software, contains
  genuine dyslexic children's handwriting (not purely synthetic),
  widely used and documented in the literature.
- **Limitations:** License marked "Unknown" on the platform — must be
  disclosed; mixes real dyslexic-children data with general
  NIST/Kaggle handwriting data with different provenance; isolated
  letters only, no words/sentences; not integrated with Lexora's
  planned architecture without adding an image/CV component that is
  not currently in scope (Section 4/9/10 of the project spec do not
  include a handwriting-image pipeline).

### Common Voice — Indian English Subset (supplementary, not primary)

- **Source:** Mozilla Common Voice
- **Official URL:** https://commonvoice.mozilla.org/
- **License:** CC0 (public domain) — well-established/documented
  project policy; the exact current release's file size and accent
  breakdown were not independently re-verified in this session
  (Common Voice's dataset page is JavaScript-rendered and could not be
  scraped directly) — **mark size figures below as unverified,
  reported in third-party literature.**
- **Access requirements:** Free download after a short email
  registration on the Common Voice site, or via Hugging Face
  (`mozilla-foundation/common_voice_*`) with a Hugging Face account.
- **Participants:** Thousands across releases; an Indian-accent subset
  has been reported in academic literature at roughly 32,000 utterances
  / ~42 hours in one release (unverified against the current release).
- **Age:** General population — predominantly adults, not children.
- **Language:** English, Indian accent (filterable by the `accent`
  metadata field)
- **Modality:** Audio + sentence transcript + demographic metadata
- **Labels:** Self-reported accent, age bracket, gender (optional,
  often missing/sparse)
- **File format:** MP3 (audio) + TSV (metadata)
- **Size:** Full releases are tens of GB; the accent-filtered subset
  is much smaller and can be extracted after download.
- **Preprocessing:** Filtering by accent metadata, format conversion
  from MP3 for feature extraction/Whisper input.
- **Lexora use:** Supplementary only — a way to sanity-check Whisper's
  transcription behavior on Indian-accented English broadly, since it
  is not child speech and has no literacy/dyslexia labels.
- **Advantages:** Enormous, free, no institutional approval, CC0.
- **Limitations:** Not children's speech; downloading the full corpus
  is unnecessarily large for this project's needs; exact current-release
  numbers unverified in this session.

---

## Recommended Dataset Strategy

Given the two-week constraint and the explicit requirement to avoid
restricted/heavy datasets, the realistic approach is **component-wise
real-data augmentation** around the project spec's existing synthetic
ML dataset, not a single unifying dataset:

- **Speech / reading-aloud component:** Use the **ASER Dataset** as the
  primary real reference for Indian children's oral reading behavior
  (proficiency levels + mistake counts) and the **NNCES corpus /
  kids-speech-dataset** as the primary real audio source for testing
  the Whisper transcription → WPM → pause/repetition/substitution
  pipeline against genuine Indian-accented children's English. These
  two together cover both the "Indian English/Hindi-English
  code-mixing" requirement and the need for real audio to validate
  the speech analysis layer, without requiring any paid or
  institutionally-gated corpus (CMU Kids Corpus, CSLU Kids' Speech,
  and MyST were all considered and are impractical for this timeline —
  see Rejected Datasets).
- **Spelling / writing component:** Use the **Birkbeck and Holbrook
  misspelling corpora** to validate that the edit-distance and
  phonetic-comparison spelling-error engine behaves sensibly on real
  misspellings, including genuine schoolchildren's errors (Holbrook).
  This requires no registration and almost no preprocessing, making it
  low-risk to integrate even late in the two-week window.
- **Risk-scoring / classifier component:** Keep the project spec's
  synthetic dataset as the primary training set for the demo XGBoost
  model (this is explicitly required by Section 11 and Section 16 of
  PROJECT_SPEC.md, and is necessary regardless, since no accessible
  dataset combines Lexora's exact feature set with dyslexia labels).
  Additionally, use the **Rello et al. Kaggle dataset** as a real,
  independent, clinically-labeled dataset to demonstrate — in the
  project report, and optionally as a secondary notebook/experiment —
  that the same XGBoost + SHAP methodology produces sensible,
  explainable separation on genuine diagnosed data, not only on
  invented numbers. This directly strengthens the "not clinically
  validated, but methodologically honest" narrative the spec requires
  (Section 20).
- **Letter-reversal / handwriting theme:** Optionally reference the
  **Dyslexia Handwriting Dataset** for illustrative figures or an
  out-of-scope bonus CV module, while being explicit in the report
  about its "Unknown" license and mixed provenance. This is not
  required for the core pipeline, since Lexora's spec defines reversal
  detection as rule-based text/grapheme comparison, not image
  classification.
- **Do not** attempt CMU Kids Corpus, CSLU Kids' Speech, H1 Children's
  Writing, ETDD70, or Samrómur Children for this project — each is
  either paid/restricted, in the wrong language, or the wrong modality
  for Lexora's architecture (see Rejected Datasets).

This combination is realistic to download and start using within the
first 1–3 days of the two-week window (all four primary datasets are
small-to-modest in size and need only a Kaggle account and/or `git
clone`), leaving the remaining time for actual pipeline development
rather than data-access logistics.

---

## Rejected Datasets

- **CMU Kids Corpus (LDC97S63)** — Real children (ages 6–11) reading
  aloud, would otherwise be an excellent fit, but costs **US$200 +
  $30 shipping** for non-LDC-members and requires an LDC license
  agreement. Rejected: **paid/restricted**, violates the project's
  ₹0-cost requirement (Section 18 of PROJECT_SPEC.md).
- **CSLU Kids' Speech (LDC2007S18)** — 1,100 US children, K–Grade 10,
  spontaneous + prompted speech. Rejected: **LDC membership/payment
  required**, exact price not confirmed but access model is the same
  paid-license structure as CMU Kids Corpus.
- **MyST Children's Speech Corpus** — ~400 hours, ~1,300 US children,
  genuinely free for non-commercial use, but requires submitting a
  request/agreement through myst.cemantix.org or Boulder Learning and
  is very large (400 hours) for a 2-week timeline. Rejected: **access
  friction + excessive size** relative to project timeline, not a
  fundamental restriction — worth reconsidering if the project is
  extended.
- **H1 Children's Writing Corpus (LDC2016T01)** — Real children's
  writing with spelling-error annotations, which is conceptually a
  great fit. Rejected: the children are **German**, not English
  speakers, and the corpus requires an **LDC license agreement**
  (restricted access). Both the language mismatch and the access
  barrier independently disqualify it.
- **ETDD70 Eye-Tracking Dyslexia Dataset** — Genuinely and directly
  downloadable from Zenodo with no restrictions, and even age-matched
  (9–10 years) to Lexora's target range. Rejected anyway: **wrong
  modality** (eye-tracking time series, requiring eye-tracking hardware
  and gaze-analysis software Lexora's architecture does not include)
  and **wrong language** (Czech reading tasks). This is the canonical
  example from the task brief of a dataset whose title/domain
  ("dyslexia") is relevant but whose actual content does not fit the
  pipeline.
- **Samrómur Children** — A genuinely excellent, freely-licensed
  (CC BY 4.0), large (131 hours), real children's speech corpus.
  Rejected solely because it is **Icelandic**, which cannot support
  Lexora's English NLP/speech components.
- **Synthetic Dyslexia Handwriting Dataset (Kaggle/Zenodo, YOLO
  format)** — Explicitly and honestly labeled by its authors as
  **synthetic**, generated by arranging letters from the (real)
  drizasazanitaisa dataset into artificial "text lines." Rejected per
  this research's explicit constraint against proposing synthetic data
  as a supporting dataset when real alternatives exist; the underlying
  real dataset (drizasazanitaisa) is used instead.
  Note: Section 11 of PROJECT_SPEC.md does separately call for the
  project's own synthetic dataset for the ML demo — that is a
  different, already-approved requirement, not something this research
  is proposing.
- **Paradis Bilingual Children's Speech Corpus (Kaggle
  rtatman/CHILDES)** — 25 real ESL children, naturalistic
  conversation. Rejected as a primary dataset: it is **naturalistic
  conversation, not reading-aloud**, so it does not exercise Lexora's
  expected-vs-actual text comparison pipeline, and its `.cha` file
  format is designed for the CLAN tool, adding **avoidable
  preprocessing complexity** for a dataset that would only serve as
  minor background reference.
- **prthmproxy/dyslexia-dataset (Kaggle)** — Found during search;
  Kaggle metadata shows license **"Unknown"** and an **empty dataset
  description** (no documented contents, participants, or provenance).
  Rejected: **unclear/undocumented content and license** — cannot
  verify what this dataset actually contains, and it appears to
  duplicate or overlap with the better-documented drizasazanitaisa
  dataset.
- **CHILDES (general, TalkBank)** — A huge, genuinely free repository
  of child language transcripts (some with audio), governed by
  TalkBank's attribution rules. Rejected as a primary dataset because
  it consists of naturalistic conversational transcripts for language
  acquisition research, not structured reading-aloud or spelling-error
  data with the labels Lexora's detection layer needs. It could be a
  minor supplementary reference for age-appropriate vocabulary in the
  Generation Layer, but this was not pursued further given the
  2-week scope.
