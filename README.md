# Lexora — AI-powered literacy screening aid & personalised practice

Lexora helps teachers and parents observe how a child (ages ~6–10) reads, writes
and speaks English, explains what it noticed, and turns that into personalised
practice. It is built for Indian classrooms on real Indian children's reading
data.

> **Lexora is a screening aid, NOT a diagnostic tool.** It never claims that a
> child has dyslexia. It reports *observed patterns* and a *screening indicator*
> that may warrant closer observation.

BCA Semester 5 NLP project. Runs entirely on a laptop: no paid APIs, no cloud,
no credit card.

## What it does

```
Teacher/parent login → child profile → screening
   reading ladder (ASER letters → words → sentences, examiner-marked; Whisper advisory, teacher can re-mark)
   writing dictation (typed; deterministic error-pattern analysis)
   speech passage (recorded; local Whisper transcription + fluency features
                   + a phoneme recogniser that flags mispronounced words Whisper would "repair")
→ ASER-trained reading-level model (XGBoost + SHAP)
→ additive screening indicator with exact per-signal contributions
→ explainable report → personalised practice (word / spelling / reading / story;
                        story + sentences via Gemini when a key is set, local generator otherwise)
→ child completes practice → progress over time
```

## Quick start

Prerequisites: Python 3.11+ (3.13 tested), Node 20+.

```bash
# backend (from repo root)
cd backend
python -m pip install -r requirements.txt
copy .env.example .env            # Windows;  cp .env.example .env  on macOS/Linux
python -m uvicorn app.main:app --reload --port 8000

# frontend (second terminal)
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

Open http://localhost:5173 and use the one-click **demo accounts** on the login
page (password `lexora123`): `teacher@lexora.demo`, `parent@lexora.demo`,
`asha@child.lexora`. The demo child *Asha* has two generated screenings and
practice history; *Rohan* is an empty-state example.

The first recording you submit downloads the Whisper `small` model (~460 MB)
and the phoneme model (~1.2 GB) once; if that is not possible, the server falls
back to a clearly labelled demo transcriber (and skips pronunciation flags) and
everything else keeps working. On a laptop with little free RAM set
`PRONUNCIATION_MODEL=` in `backend/.env`. A teacher can also press **Fill
with demo answers** during a screening to present the full flow without a
microphone.

Full setup, environment variables, MySQL, Gemini and troubleshooting:
[docs/SETUP.md](docs/SETUP.md). Design and data flow:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository layout

```
backend/
  app/            FastAPI application (routers, services, models, seed)
  lexora_nlp/     deterministic text analysis (alignment, error patterns, phonetics)
  lexora_speech/  ffmpeg conversion, faster-whisper transcription, fluency features
  lexora_ml/      ASER reading-level model, composite indicator, Rello validation
  tests/          pytest suite (29 tests, no models or API keys needed)
frontend/         React + TypeScript + Vite + Tailwind
data/             datasets (raw/processed are gitignored), metadata & validation JSON
docs/             PROJECT_SPEC.md (governing spec), DATASET_RESEARCH.md, ARCHITECTURE.md, SETUP.md
scripts/          dataset acquisition/inspection and component-validation scripts
```

## Real data behind each component

| Component | Dataset | What it provides |
|---|---|---|
| Reading ladder items, reading-level model, class norms, reading-rate reference | **ASER** (Pratham), CC BY-NC-SA 4.0 — primary | 60,966 English clips from 5,010 Indian children with prompt text and examiner labels |
| Spelling-error engine validation | **Birkbeck + Holbrook** corpora, CC BY-NC-SA 3.0 | 40k real misspellings incl. schoolchildren's writing |
| Prompt-free speech measures (secondary pilot) | **NNCES** (Kaggle, CC0), 500-file pilot | Telugu-L1 children's read English — *audio only, no transcripts in the upload* |
| XGBoost + SHAP method check (separate experiment) | **Rello et al. 2020** (Kaggle, CC BY 4.0) | Spanish gamified test with diagnosed labels — not a Lexora dataset |

Validation results are served at `GET /api/validation` and shown on the
**How it works** page. They validate components; they do not establish
clinical validity.

## Tests and checks

```bash
cd backend && python -m pytest -q tests          # API flow, NLP, ML
cd frontend && npm run build                     # TypeScript + Vite build
python scripts/validation/validate_nlp_misspellings.py
python backend/lexora_ml/train_reading_level.py  # retrain the ASER model
python backend/lexora_ml/validate_rello.py
python scripts/validation/validate_speech_aser.py --per-level 30   # needs Whisper, ~20 min CPU
```

## Limitations (short version)

No dataset gives dyslexia labels for Indian children's English, so the
indicator is a transparent composite of observed signals, not a validated
classifier. Whisper is unreliable on isolated letters (examiner marking stays
primary) and auto-corrects mispronunciations (the phoneme layer and teacher
transcript correction exist for that). NNCES has no prompts. The demo child's data is generated. See
`docs/ARCHITECTURE.md` for the full list.
