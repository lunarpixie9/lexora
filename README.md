# Text/NLP Pipeline — Meraiah

## What this module does

Analyzes typed/written responses from children to detect dyslexia-related
text patterns, specifically:

- **Letter reversals** — b/d confusion, p/q confusion, whole-word mirrors
  like `was` ↔ `saw`
- **Phonetic spelling errors** — the child writes what they *hear* rather
  than the correct spelling (e.g. `phone` → `fone`, `because` → `becuz`)
- **Edit distance scoring** — raw Levenshtein distance between target and
  typed word, used to quantify how far off the spelling is

## Core function

```python
from text_analyzer import analyze_word

result = analyze_word("phone", "fone")
# Returns:
# {
#   "reference":     "phone",
#   "typed":         "fone",
#   "correct":       False,
#   "edit_distance": 2,
#   "is_reversal":   False,
#   "is_phonetic":   True,
#   "error_type":    "phonetic"
# }
```

## Files

| File | Purpose |
|---|---|
| `edit_distance.py` | From-scratch Levenshtein distance implementation (no libraries) |
| `text_analyzer.py` | Main deliverable — reversal + phonetic detection, aggregated output |
| `requirements.txt` | Python dependencies |
| `README.md` | This file |

## How to run

```bash
# Install dependencies
pip install -r requirements.txt

# Run the edit distance self-test
python edit_distance.py

# Run the full analyzer with all 10 test cases
python text_analyzer.py
```

## How this connects to the team

The `analyze_word_list()` function produces aggregated counts that map
directly to the shared schema's `text_features` field:

```json
"text_features": {
  "reversal_count":       2,
  "phonetic_error_rate":  0.3,
  "spelling_error_count": 1,
  "error_rate":           0.6
}
```

Rewa's ML classifier consumes these numbers as part of the feature vector.

## Week 1 deliverable

- [x] `edit_distance.py` — from-scratch implementation with self-test
- [x] `text_analyzer.py` — `analyze_word()` returning `is_reversal`,
      `is_phonetic`, `edit_distance` on 10 test cases
- [x] `README.md` — this file
