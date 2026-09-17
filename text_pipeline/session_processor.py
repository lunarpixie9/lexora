"""
session_processor.py — Meraiah | Lexora Text/NLP Pipeline | Week 3

Processes a full child session (reading + spelling + phonics tasks)
and produces the exact JSON matching the team schema in docs/schema.md

Team schema output shape:
{
  "session_id": "string",
  "child_id": "string",
  "text_features": {
    "reversal_count": 0,
    "phonetic_error_rate": 0.0,
    "omission_count": 0,
    "transposition_count": 0
  }
}

This is what Rewa's ML model consumes directly.
"""

import json
import uuid
import datetime
from text_analyzer import analyze_word, analyze_word_list
from sentence_analyzer import analyze_sentence


# ─────────────────────────────────────────────────────────────────────────────
# TASK PROCESSORS
# ─────────────────────────────────────────────────────────────────────────────

def process_reading_task(reference_passage: str, typed_passage: str) -> dict:
    """
    Processes a reading/passage task.
    The child reads a multi-sentence passage and types what they read.

    Splits into sentences and analyses each one, then aggregates.
    """
    # Split into sentences on . ! ?
    import re
    ref_sentences = [s.strip() for s in re.split(r'[.!?]', reference_passage) if s.strip()]
    typed_sentences = [s.strip() for s in re.split(r'[.!?]', typed_passage) if s.strip()]

    # Pad typed sentences if child wrote fewer than reference
    while len(typed_sentences) < len(ref_sentences):
        typed_sentences.append('')

    results = []
    for ref, typed in zip(ref_sentences, typed_sentences):
        if ref:
            results.append(analyze_sentence(ref, typed))

    if not results:
        return _empty_task_result('reading')

    # Aggregate across all sentences
    total_words     = sum(r['word_count'] for r in results)
    reversals       = sum(r['reversal_count'] for r in results)
    phonetic        = sum(r['phonetic_count'] for r in results)
    omissions       = sum(r['omission_count'] for r in results)
    spelling        = sum(r['spelling_error_count'] for r in results)
    typos           = sum(r['minor_typo_count'] for r in results)
    correct         = sum(r['correct_count'] for r in results)
    avg_similarity  = sum(r['overall_similarity'] for r in results) / len(results)

    return {
        'task_type':          'reading',
        'total_words':        total_words,
        'correct_count':      correct,
        'reversal_count':     reversals,
        'phonetic_count':     phonetic,
        'omission_count':     omissions,
        'spelling_count':     spelling,
        'typo_count':         typos,
        'error_rate':         round((total_words - correct) / total_words, 3) if total_words else 0.0,
        'phonetic_error_rate':round(phonetic / total_words, 3) if total_words else 0.0,
        'avg_similarity':     round(avg_similarity, 1),
        'sentence_results':   results
    }


def process_spelling_task(word_pairs: list) -> dict:
    """
    Processes a spelling task.
    word_pairs: list of (reference_word, typed_word) tuples
    e.g. [('because', 'becuz'), ('friend', 'freind'), ...]
    """
    result = analyze_word_list(word_pairs)

    total = result['total_words']
    return {
        'task_type':           'spelling',
        'total_words':         total,
        'correct_count':       result['correct_count'],
        'reversal_count':      result['reversal_count'],
        'phonetic_count':      result['phonetic_count'],
        'spelling_count':      result['spelling_error_count'],
        'typo_count':          0,
        'omission_count':      0,
        'error_rate':          result['error_rate'],
        'phonetic_error_rate': result['phonetic_error_rate'],
        'word_details':        result['details']
    }


def process_phonics_task(phonics_pairs: list) -> dict:
    """
    Processes a phonics task.
    Child hears a sound/word and types what they hear.
    Same structure as spelling but flagged separately.
    phonics_pairs: list of (reference_word, typed_word) tuples
    """
    result = analyze_word_list(phonics_pairs)
    total = result['total_words']

    return {
        'task_type':           'phonics',
        'total_words':         total,
        'correct_count':       result['correct_count'],
        'reversal_count':      result['reversal_count'],
        'phonetic_count':      result['phonetic_count'],
        'spelling_count':      result['spelling_error_count'],
        'typo_count':          0,
        'omission_count':      0,
        'error_rate':          result['error_rate'],
        'phonetic_error_rate': result['phonetic_error_rate'],
        'word_details':        result['details']
    }


def _empty_task_result(task_type: str) -> dict:
    return {
        'task_type': task_type,
        'total_words': 0, 'correct_count': 0,
        'reversal_count': 0, 'phonetic_count': 0,
        'omission_count': 0, 'spelling_count': 0,
        'typo_count': 0, 'error_rate': 0.0,
        'phonetic_error_rate': 0.0
    }


# ─────────────────────────────────────────────────────────────────────────────
# TRANSPOSITION DETECTOR
# ─────────────────────────────────────────────────────────────────────────────

def count_transpositions(word_details: list) -> int:
    """
    Counts letter transpositions (adjacent letters swapped).
    e.g. friend → freind  (ei swapped to ie)
    Identified when edit_distance == 2 and not reversal/phonetic.
    """
    count = 0
    for d in word_details:
        if (d.get('edit_distance') == 2
                and not d.get('is_reversal')
                and not d.get('is_phonetic')
                and d.get('error_type') == 'spelling_error'):
            ref = d.get('reference', '')
            typ = d.get('typed', '')
            # Check if it's a transposition: same chars, different order
            if sorted(ref) == sorted(typ) and len(ref) == len(typ):
                count += 1
    return count


# ─────────────────────────────────────────────────────────────────────────────
# MAIN SESSION PROCESSOR
# ─────────────────────────────────────────────────────────────────────────────

def process_session(
    child_id: str,
    reading_reference: str,
    reading_typed: str,
    spelling_pairs: list,
    phonics_pairs: list,
    session_id: str = None
) -> dict:
    """
    Processes a full session for one child and returns the team schema JSON.

    Args:
        child_id:           unique child identifier
        reading_reference:  the passage the child was asked to read/type
        reading_typed:      what the child actually typed
        spelling_pairs:     [(reference, typed), ...] for spelling task
        phonics_pairs:      [(reference, typed), ...] for phonics task
        session_id:         optional — auto-generated if not provided

    Returns the exact team schema dict:
    {
        "session_id": ...,
        "child_id": ...,
        "text_features": {
            "reversal_count": ...,
            "phonetic_error_rate": ...,
            "omission_count": ...,
            "transposition_count": ...
        }
    }
    Plus a "debug" section with full details for dashboard use.
    """
    if not session_id:
        session_id = str(uuid.uuid4())

    # Process each task
    reading_result  = process_reading_task(reading_reference, reading_typed)
    spelling_result = process_spelling_task(spelling_pairs)
    phonics_result  = process_phonics_task(phonics_pairs)

    all_tasks = [reading_result, spelling_result, phonics_result]

    # Aggregate across all tasks for the team schema
    total_words    = sum(t['total_words'] for t in all_tasks)
    total_reversals = sum(t['reversal_count'] for t in all_tasks)
    total_phonetic  = sum(t['phonetic_count'] for t in all_tasks)
    total_omissions = sum(t['omission_count'] for t in all_tasks)

    # Count transpositions from spelling + phonics word details
    all_word_details = []
    if 'word_details' in spelling_result:
        all_word_details.extend(spelling_result['word_details'])
    if 'word_details' in phonics_result:
        all_word_details.extend(phonics_result['word_details'])
    total_transpositions = count_transpositions(all_word_details)

    overall_phonetic_rate = round(total_phonetic / total_words, 3) if total_words else 0.0

    # ── Team schema output (exactly matches docs/schema.md) ──
    schema_output = {
        "session_id": session_id,
        "child_id":   child_id,
        "text_features": {
            "reversal_count":      total_reversals,
            "phonetic_error_rate": overall_phonetic_rate,
            "omission_count":      total_omissions,
            "transposition_count": total_transpositions
        }
    }

    # ── Full debug output for dashboard/teacher view ──
    debug_output = {
        "timestamp":       datetime.datetime.utcnow().isoformat() + "Z",
        "total_words":     total_words,
        "reading_task":    reading_result,
        "spelling_task":   spelling_result,
        "phonics_task":    phonics_result,
        "per_task_summary": {
            "reading":  f"{reading_result['correct_count']}/{reading_result['total_words']} correct, "
                        f"{reading_result['reversal_count']} reversals",
            "spelling": f"{spelling_result['correct_count']}/{spelling_result['total_words']} correct, "
                        f"{spelling_result['phonetic_count']} phonetic errors",
            "phonics":  f"{phonics_result['correct_count']}/{phonics_result['total_words']} correct, "
                        f"{phonics_result['phonetic_count']} phonetic errors",
        }
    }

    return {**schema_output, "debug": debug_output}


# ─────────────────────────────────────────────────────────────────────────────
# TEST — simulate a real child session
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    # Simulated session for a 7-year-old child
    CHILD_ID = "child_001"

    # Task 1: Reading passage
    READING_REF = (
        "The dog ran to the park. "
        "She was very happy. "
        "Because it was sunny outside."
    )
    READING_TYPED = (
        "The bog ran to the park. "   # dog → bog (reversal)
        "She saw very happy. "         # was → saw (reversal)
        "Becuz it was sunny outside."  # Because → Becuz (phonetic)
    )

    # Task 2: Spelling word list
    SPELLING_PAIRS = [
        ("because",   "becuz"),     # phonetic
        ("friend",    "freind"),    # transposition
        ("beautiful", "butiful"),   # spelling error
        ("phone",     "fone"),      # phonetic
        ("was",       "saw"),       # reversal
        ("people",    "pepol"),     # spelling error
        ("bridge",    "brige"),     # minor typo
        ("cat",       "cat"),       # correct
    ]

    # Task 3: Phonics (child hears sound, types word)
    PHONICS_PAIRS = [
        ("knight",  "nite"),    # phonetic
        ("write",   "rite"),    # phonetic
        ("dog",     "bog"),     # reversal
        ("laugh",   "laf"),     # phonetic
        ("bed",     "ded"),     # reversal
        ("cat",     "cat"),     # correct
    ]

    print("=" * 65)
    print("LEXORA — Session Processor | Meraiah | Week 3 Deliverable")
    print("=" * 65)

    result = process_session(
        child_id=CHILD_ID,
        reading_reference=READING_REF,
        reading_typed=READING_TYPED,
        spelling_pairs=SPELLING_PAIRS,
        phonics_pairs=PHONICS_PAIRS
    )

    # Print the team schema output (what Rewa gets)
    print("\n── TEAM SCHEMA OUTPUT (for Rewa's ML model) ──")
    schema_only = {k: v for k, v in result.items() if k != 'debug'}
    print(json.dumps(schema_only, indent=2))

    # Print the summary
    print("\n── PER-TASK SUMMARY ──")
    for task, summary in result['debug']['per_task_summary'].items():
        print(f"  {task.capitalize():10} : {summary}")

    print(f"\n  Total words analysed : {result['debug']['total_words']}")
    print("\n" + "=" * 65)
    print("Week 3 session_processor.py complete.")
    print("=" * 65)