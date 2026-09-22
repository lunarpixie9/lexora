# Lexora — setup and running guide

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.11+ (3.13 tested) | `python --version` |
| Node.js + npm | 20+ | `node --version` |
| ffmpeg | none needed | the `imageio-ffmpeg` wheel bundles a binary; a system ffmpeg is used if present |
| MySQL | optional | SQLite is the default and needs nothing |

Disk: a few hundred MB for Python packages (faster-whisper runs on CTranslate2; PyTorch is not required) plus ~460 MB for the Whisper `small` model, downloaded once to `~/.cache/huggingface`.

## 2. Backend

```bash
cd backend
python -m pip install -r requirements.txt
copy .env.example .env        # then edit .env
python -m uvicorn app.main:app --reload --port 8000
```

* API docs: http://localhost:8000/docs
* Health: http://localhost:8000/api/health — reports database, Whisper state, model artifact and practice generator.
* On first start the database tables are created and (if `SEED_DEMO=true`) the demo accounts and demo children are seeded.

### Environment variables (`backend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./storage/lexora.db` | SQLAlchemy URL. MySQL: `mysql+pymysql://user:pass@localhost:3306/lexora` (create the empty database first; tables are created automatically) |
| `SECRET_KEY` | dev value | JWT signing key — set a long random string |
| `ACCESS_TOKEN_MINUTES` | 720 | token lifetime |
| `STORAGE_DIR` | `./storage` | recordings and converted audio (local storage backend; gitignored) |
| `WHISPER_MODEL` | `small` | faster-whisper size: `tiny`/`base`/`small`/`medium`. Empty string disables Whisper (demo transcriber) |
| `WHISPER_DEVICE` | `cpu` | `cuda` if you have a GPU with CTranslate2 support |
| `PRONUNCIATION_MODEL` | `facebook/wav2vec2-xlsr-53-espeak-cv-ft` | phoneme recogniser for the pronunciation layer (downloads ~1.2 GB once, ~1 GB RAM quantised). Empty string disables it; the app then simply omits pronunciation flags |
| `PRELOAD_MODELS` | `true` | load the speech models in the background at startup; `false` defers loading to the first recording |
| `GEMINI_API_KEY` | empty | optional Google Gemini free-tier key (https://aistudio.google.com/apikey). When set, the practice **story and read-aloud sentences** come from Gemini (validated, with automatic fallback); word-choice and spelling drills always stay deterministic |
| `GEMINI_MODEL` | `gemini-3.6-flash` | any current flash model the key can access; Lexora disables the model's "thinking" mode, which otherwise truncates the JSON and pushes latency past a minute |
| `SEED_DEMO` | `true` | seed demo accounts/children on first start |
| `DEMO_PASSWORD` | `lexora123` | password for the demo accounts |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | comma-separated allowed origins |

Never commit `.env`; it is gitignored. Secrets are never sent to the frontend.

### Whisper

* First use of a recording loads the model (10–20 s) and downloads it if absent. Subsequent short clips take ~3–6 s on a laptop CPU.
* If loading fails (no network, unsupported CPU), the health endpoint shows `whisper.state = unavailable` and the server uses the **demo transcriber**; the session is flagged `mode = demo` and every report says so.
* To force the demo transcriber (e.g. for a fast presentation) set `WHISPER_MODEL=`.
* `WHISPER_MODEL=large-v3-turbo` hears accented speech better but takes ~4× longer on CPU and ~2 GB RAM; it does *not* stop Whisper auto-correcting mispronunciations — that is what the pronunciation layer is for.

### Pronunciation layer (phoneme recogniser)

With `PRELOAD_MODELS=true` (default) both speech models load in a background thread right after startup (`/api/health` shows `loaded` when done; ~40 s on this laptop once the weights are cached), so the first recording is not delayed. Measured backend memory: **≈2.6 GB** with Whisper `small` + the int8 phoneme model, ≈1.5 GB with `PRONUNCIATION_MODEL=`, ≈1 GB with both disabled. With less than ~3 GB free, set `PRONUNCIATION_MODEL=` (or `WHISPER_MODEL=base`) before a demo, and close memory-heavy apps. Requires `torch` (CPU build is enough) and `transformers` from `requirements.txt`.

### Personalised practice with Gemini (optional)

With `GEMINI_API_KEY` set, the **story and the six read-aloud sentences** are written by Gemini for the individual child; word-choice and spelling drills stay deterministic because they must key off the child's exact error patterns and have provably correct answers. Measured on the free tier: 15-45 s per generation, and `503 high demand` happens often enough that Lexora retries three times and then silently keeps the deterministic story — the UI tells the teacher a story is being written and badges each activity with the generator that made it. Nothing breaks without a key.

### MySQL (the spec's target database)

Lexora runs on either database; the schema is written to be valid on both (no unbounded `VARCHAR`, JSON columns, quoted reserved words). SQLite is the zero-setup default so a teammate can clone and run; MySQL is one setting away.

```bash
# once, with your MySQL root password
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS lexora CHARACTER SET utf8mb4;   CREATE USER IF NOT EXISTS 'lexora'@'localhost' IDENTIFIED BY '<pick-a-password>';   GRANT ALL ON lexora.* TO 'lexora'@'localhost'; FLUSH PRIVILEGES;"
```

Then in `backend/.env`:

```
DATABASE_URL=mysql+pymysql://lexora:<pick-a-password>@localhost:3306/lexora
```

Restart the backend — tables are created automatically and the demo data is seeded on first start. `pymysql` is in `requirements.txt`. To go back to SQLite, comment the line out. Note the two databases hold separate data: switching does not migrate existing screenings.

## 3. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to :8000
npm run build        # type-check + production build into dist/
```

`frontend/.env.example` shows `VITE_API_URL`; leave it empty in development (the Vite proxy handles `/api`). For a deployed backend set it to the API origin and add that frontend origin to `CORS_ORIGINS`.

## 4. Demo mode

The whole product flow can be demonstrated with no child, no microphone and no
internet:

1. Log in with a demo account (buttons on the login page).
2. Teacher → *Asha* already has two generated screenings, reports, practice and progress.
3. Teacher → *New screening* → *Rohan* → mark a few reading items, then **Fill with demo answers** → **Finish and analyse** → report → **Generate personalised practice**. The teacher dashboard shows this walkthrough for the demo account; an unfinished screening can be discarded from the child's *Screenings* tab.
4. Log in as `asha@child.lexora` to complete practice activities and see progress.

Everything generated this way is flagged: children `is_demo`, sessions `mode = demo`, speech results `engine = demo`, and the UI shows a **Demo data** badge. Demo content is a presentation convenience, never evidence.

## 5. Tests and validation

```bash
cd backend && python -m pytest -q tests        # 26 tests: NLP, ML, pronunciation scoring, full API flow (temp SQLite DB, no models)
cd frontend && npm run build                   # TypeScript errors fail the build
```

Component-validation scripts (outputs go to `data/metadata/validation_*.json` and are served by `/api/validation`):

| Script | Data | Runtime |
|---|---|---|
| `scripts/validation/validate_nlp_misspellings.py` | Birkbeck + Holbrook | ~10 s |
| `backend/lexora_ml/train_reading_level.py` | ASER (processed CSVs) | ~1 min |
| `backend/lexora_ml/validate_rello.py` | Rello CSVs | ~1 min |
| `scripts/validation/validate_speech_aser.py --per-level 30` | ASER raw ZIPs + Whisper | ~20 min CPU |
| `scripts/validation/validate_speech_nnces_pilot.py --files 40` | NNCES pilot + Whisper | ~3 min |

The raw datasets are not in Git; see `data/README.md` for how they were obtained (`scripts/data/`). The trained model artifact (`backend/lexora_ml/artifacts/reading_level_model.json`, 2.6 MB) is produced by the training script; without it the app falls back to the transparent ladder rule and says so.

## 6. Troubleshooting

* **"Cannot reach the Lexora API"** in the UI — the backend is not running on port 8000, or `VITE_API_URL` points elsewhere.
* **Recording button missing** — the browser has no `MediaRecorder` (very old browser) or the page is not on `localhost`/HTTPS, which browsers require for microphone access.
* **`Could not analyse recording`** — ffmpeg could not decode the upload; check `python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"`.
* **Whisper slow** — use `WHISPER_MODEL=base` for presentations; accuracy drops slightly.
* **Port in use** — change `--port` and `CORS_ORIGINS`/proxy target accordingly.
