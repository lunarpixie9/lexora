# Lexora 🦉✨

**Lexora** is an early-intervention dyslexia screening and educational tracking platform designed specifically for children. Featuring a warm, whimsical, hand-drawn aesthetic, Lexora removes the anxiety from screening tests by making them feel like interactive storybook activities. 

Behind the friendly interface is a powerful Python-based NLP engine that analyzes spelling patterns, phonetic errors, letter transpositions, and reading fluency to provide actionable insights for parents and educators.

---

## 🌟 Key Features

* **Secure User Accounts**: Parents and educators can create accounts to securely track a child's progress over time.
* **Written Task Analysis**: A custom Python engine that doesn't just check for "wrong" words, but specifically analyzes text for common dyslexia indicators:
  * Phonetic substitutions
  * Letter reversals (e.g., `b`/`d`, `p`/`q`)
  * Transpositions (e.g., `was` -> `saw`)
* **Read Aloud Tasks**: Evaluates reading fluency and pause frequency to detect decoding difficulties.
* **Dynamic Dashboard**: 
  * Tracks historical progress over time.
  * Calculates an overall risk score (Good, Moderate Risk, High Risk).
  * Provides a detailed indicator breakdown and highlights specific flagged words.
  * Offers targeted recommendations based on the child's performance.
* **PDF Reports**: One-click generation of comprehensive screening reports to share with specialists or teachers.
* **Whimsical Design**: A beautiful, stress-free UI utilizing soft colors, rounded components, and Lisa Glanz-inspired illustrations.

---

## 🛠️ Tech Stack

**Frontend**
* **Framework**: React (built with Vite)
* **Routing**: React Router DOM
* **Styling**: Vanilla CSS (CSS-in-JS style objects) for complete custom design control
* **PDF Generation**: `html2pdf.js`
* **Icons**: `lucide-react`

**Backend**
* **Framework**: FastAPI (Python)
* **Database**: SQLite (via SQLAlchemy ORM)
* **Authentication**: JWT / bcrypt (via `passlib`)
* **Analysis Engine**: Custom Python logic utilizing `pyspellchecker` for advanced string and phonetic comparison.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v16+)
* **Python** (3.9+)

### 1. Setup the Backend
Navigate to the backend directory, set up your virtual environment, and start the FastAPI server:

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy pyspellchecker passlib bcrypt python-multipart

# Start the server (runs on http://127.0.0.1:8000)
uvicorn main:app --reload
```

### 2. Setup the Frontend
Open a new terminal window, navigate to the frontend directory, and start the Vite development server:

```bash
cd frontend
npm install
# Start the dev server (runs on http://localhost:5173)
npm run dev
```

### 3. Usage
1. Open your browser and navigate to `http://localhost:5173`.
2. Click **Sign Up** to create a new parent/educator account.
3. Access the **Dashboard**.
4. Click **Start Written Task** to run a screening. The results will be automatically saved to your account and visualized on the dashboard!

---

## 📂 Project Structure

```text
Lexora/
├── backend/
│   ├── ml/
│   │   └── analyzer.py     # Core NLP dyslexia detection logic
│   ├── main.py             # FastAPI routes (Auth, Assessments)
│   ├── models.py           # SQLAlchemy database schemas
│   └── database.py         # DB connection setup
└── frontend/
    ├── src/
    │   ├── assets/         # Whimsical illustrations and imagery
    │   ├── components/     # React components (Dashboard, Tasks, Auth)
    │   ├── context/        # React Context (AuthContext)
    │   ├── App.jsx         # Main router and layout
    │   └── index.css       # Global design tokens and aesthetics
    └── package.json
```

---

*Designed and built with ❤️ to make reading and writing accessible to everyone.*
