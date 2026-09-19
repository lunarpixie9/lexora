# LEXORA — PROJECT SPECIFICATION

## 1. Project Overview

Project Name: Lexora

Lexora is an AI-powered educational literacy screening and personalized
practice application for children approximately ages 6–10.

The system analyzes reading, writing, and speech-related signals to
identify patterns that may warrant closer observation and then generates
personalized literacy practice.

IMPORTANT:
Lexora is a screening aid, NOT a diagnostic tool.

The system must never claim that a child has dyslexia or provide a
medical diagnosis.

Use terms such as:
- screening indicator
- detected pattern
- literacy signal
- observed error
- area for practice
- may warrant further observation

This is a BCA Semester 5 NLP academic project.

## 2. Problem

The project addresses several gaps:

- Early literacy difficulties can be difficult for classroom teachers
  to identify.
- Specialist assessment may not be easily available everywhere.
- Existing literacy tools may not adequately account for Indian English,
  accents, or Hindi-English code-mixing.
- A screening result should lead to personalized practice rather than
  simply producing a score.

## 3. Core Architecture

Lexora has four major layers:

### Detection Layer

Analyzes:
- spelling errors
- letter reversals
- phonetic spelling errors
- omissions
- substitutions
- repeated words
- skipped words
- pronunciation mismatches
- reading pauses
- fluency indicators

### Risk Scoring Layer

Uses extracted features and a machine-learning classifier to produce
a screening indicator.

Preferred model:
XGBoost

Use SHAP for explainability.

The model is a prototype and is NOT clinically validated.

### Generation Layer

Generates personalized educational content based on the child's
detected error profile.

Content may include:
- short stories
- spelling exercises
- reading exercises
- word exercises
- comprehension questions

An LLM may be used for generation, but the application must also work
without an external API.

### Reporting Layer

Provides dashboards and reports for:
- teachers
- parents
- children

Reports should include:
- screening indicator
- detected literacy patterns
- reading findings
- writing findings
- speech findings
- feature explanations
- progress over time
- personalized practice recommendations

## 4. Technology Stack

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Recharts

Backend:
- Python
- FastAPI
- SQLAlchemy
- Pydantic

Database:
- MySQL

Machine Learning:
- scikit-learn
- XGBoost
- SHAP

NLP:
- Python
- edit distance / Levenshtein distance
- rule-based reversal detection
- phonetic comparison
- grapheme-level comparison

Speech:
- OpenAI Whisper running locally
- FFmpeg
- librosa

LLM:
- Prefer a free-tier API such as Gemini if available
- The application must have a local deterministic fallback
- Never make a paid API mandatory

Storage:
- Local storage for development
- Design a storage abstraction that can support S3-compatible
  storage later

Authentication:
- JWT

## 5. User Roles

### Teacher

The teacher can:
- log in
- view children
- create child profiles
- start a screening
- view screening results
- view explanations
- view progress
- generate personalized practice

### Parent

The parent can:
- view the child's screening history
- view progress
- view practice recommendations

### Child

The child can:
- complete reading tasks
- complete writing tasks
- submit speech recordings
- complete personalized practice
- view simple progress information

## 6. Main Routes

Public:

/
 /about
 /how-it-works
 /login

Teacher:

/teacher/dashboard
/teacher/children
/teacher/children/:id
/teacher/screening/new
/teacher/screening/:id
/teacher/reports/:id
/teacher/practice/:id

Parent:

/parent/dashboard
/parent/child/:id
/parent/progress/:id

Child:

/child/home
/child/screening
/child/reading
/child/writing
/child/speech
/child/practice
/child/practice/:id
/child/progress

## 7. Database Entities

Create appropriate relational models for:

- users
- children
- screening_sessions
- reading_tasks
- writing_tasks
- speech_tasks
- screening_responses
- text_analysis_results
- speech_analysis_results
- risk_scores
- risk_features
- practice_activities
- practice_attempts
- progress_records
- consents

Use foreign keys and timestamps.

## 8. Screening Flow

The intended end-to-end flow is:

Teacher selects child
        ↓
Teacher starts screening
        ↓
Child completes reading task
        ↓
Child completes writing task
        ↓
Child completes speech task
        ↓
Text analysis
        ↓
Speech analysis
        ↓
Feature extraction
        ↓
XGBoost screening indicator
        ↓
SHAP explanation
        ↓
Screening report
        ↓
Error profile
        ↓
Personalized practice
        ↓
Child completes practice
        ↓
Progress is updated

## 9. NLP Analysis

The system should compare expected text with the child's response.

Calculate useful features including:

- total words
- correct words
- spelling errors
- omissions
- substitutions
- additions
- transpositions
- edit distance
- word error rate
- reversal indicators
- phonetic similarity

Example result:

{
  "word_error_rate": 0.20,
  "spelling_error_count": 4,
  "reversal_count": 2,
  "phonetic_error_count": 3,
  "omission_count": 1
}

The NLP engine should work locally without an API.

## 10. Speech Analysis

Implement:

Audio upload
→ validation
→ storage
→ Whisper transcription
→ expected-vs-actual comparison
→ fluency analysis
→ feature extraction

Useful features include:

- duration
- words per minute
- pause count
- repeated words
- skipped words
- substitutions
- transcription mismatch

The architecture should allow future phoneme-level forced alignment,
but forced alignment must NOT be required for the first working version.

If Whisper cannot run locally because of missing dependencies,
provide a clearly labelled demo fallback while retaining the real
Whisper implementation.

Real-data validation of this component (Section 21): ASER is the
primary reference because it supplies Indian children's English
read-aloud audio together with the prompt text and examiner
correctness labels, which is what expected-vs-actual comparison and
WPM/pause calibration require. The NNCES pilot is secondary: it
supplies audio only (no prompt text or transcripts) and is used for
prompt-free measures such as duration, speech-rate proxies, pause
statistics and Whisper robustness on Telugu-L1 Indian English. NNCES
prompts must not be reconstructed or guessed from the audio.

## 11. Machine Learning

Real datasets are the primary data source for model development and
evaluation (see Section 21).

Synthetic data may be generated ONLY for:
- controlled unit/integration testing of the pipeline
- augmentation where a real dataset is too small for a feature
- the offline demo mode (Section 16)
- features that no approved real dataset can provide

Synthetic data must never be presented as real child data, and must
never be the sole evidence supporting any claim made by the project.
Every synthetic record, file, and screen must be clearly labelled as
synthetic/demo.

Possible features:

- spelling_error_rate
- reversal_count
- phonetic_error_count
- omission_count
- substitution_count
- reading_wpm
- pause_count
- repetition_count
- mispronunciation_count
- writing_accuracy

Train an XGBoost classifier.

Create:
- preprocessing
- feature extraction
- training
- saved model
- prediction service
- SHAP explanation

The model must be described as a prototype and not clinically validated.

The Rello et al. dataset (Section 21) is used only to show that the
XGBoost + SHAP methodology behaves sensibly on genuine diagnosed data;
its features (a Spanish gamified test) are not Lexora's features, and
no accuracy figure from that experiment transfers to Lexora's own
indicator.

## 12. Screening Indicator

Display a result such as:

"Screening Indicator"

NOT:

"Dyslexia Probability"

NOT:

"Dyslexia Diagnosis"

Include explanatory text:

"This indicator is generated from observed literacy signals in this
prototype and is not a medical diagnosis."

The result should contain:
- overall indicator
- feature values
- contributing indicators
- explanation
- timestamp
- screening session

## 13. Personalized Practice

Generate educational material based on:

- child's age
- reading level
- detected error profile
- recent progress
- target skills

Possible outputs:

- short story
- spelling activity
- reading activity
- word-choice activity
- comprehension questions

LLM output must be structured and validated.

The LLM must never diagnose the child.

If the external API is unavailable, the application must use a
clearly labelled local/demo content generator.

The project must remain fully usable without a paid API.

## 14. UI Design

Design direction:

- warm
- educational
- modern
- calm
- trustworthy
- accessible

Suggested palette:
- warm cream
- deep navy
- muted lavender
- soft teal
- warm yellow
- white

Use:
- rounded cards
- generous spacing
- subtle shadows
- clear typography
- restrained animations

Teacher and parent dashboards should be professional.

Child-facing pages should be simpler, friendlier, and less information
dense.

Avoid:
- hospital-like styling
- excessive neon AI aesthetics
- excessive cartoon styling
- cluttered dashboards

## 15. Privacy and Ethics

The application handles children's educational information.

Implement:
- consent records
- role-based access
- protected routes
- secure API design
- file type validation
- file size limits
- environment variables for secrets

Never commit API keys or passwords.

Display this disclaimer:

"Lexora is an educational screening aid and is not a diagnostic tool.
Results indicate patterns that may warrant further observation or
professional assessment."

## 16. Demo Mode

The application MUST include a complete demo mode.

The project must be demonstrable without:

- real children
- clinical datasets
- paid APIs
- external speech recordings
- an internet connection where possible

Create:
- demo teacher
- demo parent
- demo child
- demo screening results
- demo practice activities
- demo progress history

Clearly label synthetic/demo information.

Demo mode is a presentation convenience, not evidence. Any claim about
pipeline behaviour must be backed by the real datasets in Section 21,
not by demo-mode records.

## 17. Development Order

Build in this order:

1. Project foundation
2. Frontend UI
3. Backend and MySQL
4. Text/NLP engine
5. ML + XGBoost + SHAP
6. Whisper speech processing
7. LLM/free API personalization
8. Reporting
9. Full integration
10. Testing, security, accessibility and polish

Every phase must leave the project runnable.

## 18. Cost Requirement

The project should have a ₹0 additional-cost target.

Do not require:
- paid APIs
- AWS
- paid cloud storage
- paid databases
- paid software

If an external API is useful, prefer a genuine free tier and provide
a local fallback.

Never require a credit card merely to demonstrate the project.

## 19. Quality Requirements

The finished application should have:

- working frontend
- working backend
- working database
- authentication
- reusable components
- API validation
- loading states
- empty states
- error handling
- responsive design
- basic automated tests
- documentation
- demo data
- API documentation

The complete demo flow must work from login through screening,
analysis, reporting, personalized practice and progress.

## 20. Academic Purpose

This is a university prototype demonstrating:

- Natural Language Processing
- speech processing
- feature engineering
- machine learning
- explainability
- LLM-based personalization
- database systems
- REST APIs
- React frontend development

Do not invent clinical accuracy, medical validation, or diagnostic
capabilities.

The project should demonstrate the technical pipeline honestly.

## 21. Data Sources

The project must use REAL datasets as its primary data sources.
Synthetic data is subordinate to real data (see Section 11).

Approved real datasets (research and access verification in
docs/DATASET_RESEARCH.md; per-dataset profiles in data/metadata/):

| Dataset | License | Role | Lexora component | Status (verified 2026-09-19) |
|---|---|---|---|---|
| ASER Dataset (Pratham) | CC BY-NC-SA 4.0 | PRIMARY real Indian-child speech/reading dataset | Speech analysis, reading fluency, Indian children's reading behaviour; English letter/word/sentence read-aloud audio WITH prompt text and examiner correctness labels | Downloaded and verified: 5,301 sessions, 81,338 clips, 123.7 h; 60,966 English clips (47.3 h) |
| NNCES Corpus (Kaggle) | CC0 | SECONDARY speech-validation pilot | Prompt-free speech measures and Whisper robustness on Telugu-L1 Indian children's English. The uploaded corpus contains audio files only — no prompt text, transcripts or metadata files | Pilot of 500 read-speech WAVs (1 session × 50 speakers) downloaded and verified; full corpus (10,000 WAV, 6.69 GB) deferred |
| Birkbeck + Holbrook misspelling corpora | CC BY-NC-SA 3.0 | Real-misspelling validation | Spelling-error, edit-distance and phonetic-comparison validation against real (including schoolchildren's) misspellings | Downloaded and verified |
| Rello et al. "Predicting Risk of Dyslexia" (Kaggle) | CC BY 4.0 | Separate methodological validation of ML + explainability | Shows that XGBoost + SHAP behaves sensibly on genuine diagnosed data; NOT a Lexora dyslexia dataset, NOT a source of English content or Lexora's own features | Downloaded and verified: 3,644 + 1,395 participants, 196 features |

Rules:
- Raw datasets live under data/raw/ and are never committed to Git.
- Raw files are never modified; preprocessing writes to data/processed/.
- Every dataset is documented in data/README.md with source, URL,
  license, download date, file count, size, intended use and
  preprocessing.
- Non-commercial licenses (CC BY-NC-SA) are compatible with this
  academic project; the restriction must be stated in the report.
- Paid or restricted corpora (for example LDC corpora) are not used.
- The Dyslexia Handwriting Dataset (Kaggle) is excluded from the core
  pipeline because its license is undeclared and it is image-based,
  which does not match the text-based NLP architecture.
- Where a required feature cannot be obtained from an approved real
  dataset, the gap must be documented and any synthetic substitute
  labelled as such.
- NNCES: the downloaded corpus was verified to contain audio files
  only, despite the dataset page's description. Prompt text or
  transcripts must not be invented or reconstructed from the audio;
  until a documented source of the prompts exists, NNCES is limited to
  prompt-free measures and is not used for expected-vs-actual
  comparison.
- Rello et al.: used only to validate the modelling and explanation
  method. Its Spanish-language, gamified-test features and labels say
  nothing about Indian children's English and must not be presented
  as evidence about Lexora's screening indicator.

No approved dataset provides per-child dyslexia labels for English
text produced by Indian children. The screening indicator therefore
remains a prototype; the real datasets validate individual pipeline
components and the modelling method, not clinical accuracy. Passing
these component validations shows that the pipeline behaves sensibly
on real data; it does not establish clinical or diagnostic validity
for Lexora, and no result from them may be described as such
(Sections 1, 12 and 20).
