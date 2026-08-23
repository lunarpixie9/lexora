"""
text_analyzer.py — Meraiah | Lexora Text/NLP Pipeline | Week 1

Main deliverable: the analyze_word() function.

Takes (reference_word, typed_word) and returns a dict:
  {
    "reference":     "phone",
    "typed":         "fone",
    "correct":       False,
    "edit_distance": 2,
    "is_reversal":   False,
    "is_phonetic":   True,
    "error_type":    "phonetic"
  }

This output feeds into the shared team feature vector (docs/schema.md)
under "text_features". Rewa's ML model consumes aggregated counts from
running analyze_word() across a full session's word list.
"""

from edit_distance import levenshtein_distance


# ─────────────────────────────────────────────────────────────────────────────
# REVERSAL DETECTION
# ─────────────────────────────────────────────────────────────────────────────

# Letter pairs that are visually mirror images of each other.
# A dyslexic child might write 'b' when they mean 'd', or vice versa.
REVERSAL_PAIRS = [
    ('b', 'd'),
    ('d', 'b'),
    ('p', 'q'),
    ('q', 'p'),
    ('m', 'w'),
    ('w', 'm'),
    ('n', 'u'),
    ('u', 'n'),
]

# Whole words that are visual mirrors of each other.
# "was" ↔ "saw", "on" ↔ "no", etc.
REVERSAL_WORDS = {
    'was':  'saw',
    'saw':  'was',
    'on':   'no',
    'no':   'on',
    'net':  'ten',
    'ten':  'net',
    'pot':  'top',
    'top':  'pot',
    'dog':  'god',
    'god':  'dog',
    'bad':  'dab',
    'dab':  'bad',
    'rat':  'tar',
    'tar':  'rat',
    'tip':  'pit',
    'pit':  'tip',
    'now':  'won',
    'won':  'now',
}


def is_reversal(reference: str, typed: str) -> bool:
    """
    Returns True if the typed word looks like a reversal of the reference.

    Two checks:
      1. Whole-word mirror: "was" typed as "saw"
      2. Letter-pair swap:  "dog" typed as "bog" (d→b swap)

    Args:
        reference: the correct target word
        typed:     what the child actually wrote

    Returns:
        True if a reversal pattern is detected
    """
    ref = reference.lower().strip()
    typ = typed.lower().strip()

    if ref == typ:
        return False

    # Check 1: whole-word mirror reversal
    if ref in REVERSAL_WORDS and REVERSAL_WORDS[ref] == typ:
        return True
    if typ in REVERSAL_WORDS and REVERSAL_WORDS[typ] == ref:
        return True

    # Check 2: single letter-pair swap produces the typed word
    # (only valid when words are same length — a swap doesn't add/remove chars)
    if len(ref) == len(typ):
        for (a, b) in REVERSAL_PAIRS:
            # Replace every occurrence of 'a' with 'b' in reference
            swapped = ref.replace(a, b)
            if swapped == typ:
                return True

    return False


# ─────────────────────────────────────────────────────────────────────────────
# PHONETIC ERROR DETECTION
# ─────────────────────────────────────────────────────────────────────────────

# Pairs of (correct_spelling_chunk, phonetic_equivalent).
# A phonetic error is when the child writes what they *hear*,
# not the conventional spelling.
#
# Examples:
#   "phone" → the child hears /f/, writes "fone"   (ph → f)
#   "know"  → the child hears /n/, writes "no"     (kn → n)
#   "light" → the child hears /lIt/, writes "lit"  (igh → i)
#
# Note: some of these also apply in reverse — the child over-corrects
# a simple spelling into a more complex one (hypercorrection).

PHONETIC_PATTERNS = [
    # Consonant clusters / digraphs
    ('ph',   'f'),      # phone → fone
    ('ck',   'k'),      # back → bak
    ('gh',   'f'),      # laugh → laf
    ('wh',   'w'),      # what → wat
    ('kn',   'n'),      # know → no
    ('wr',   'r'),      # write → rite
    ('gn',   'n'),      # gnome → nome
    ('mb',   'm'),      # lamb → lam
    ('lk',   'k'),      # talk → tok (dropping the l)
    ('tch',  'ch'),     # catch → cach
    ('dge',  'j'),      # bridge → brij
    ('qu',   'kw'),     # queen → kween

    # Consonant sounds (especially common for Hindi-L1 speakers)
    ('th',   'd'),      # the → de
    ('th',   't'),      # think → tink
    ('v',    'w'),      # very → wery
    ('w',    'v'),      # water → vater

    # Vowel patterns / digraphs
    ('oo',   'u'),      # food → fud
    ('ea',   'e'),      # beat → bet
    ('ai',   'a'),      # rain → ran
    ('igh',  'i'),      # light → lit
    ('ou',   'ow'),     # out → owt
    ('oa',   'o'),      # boat → bot
    ('ue',   'oo'),     # blue → bloo
    ('ew',   'oo'),     # new → noo
    ('aw',   'or'),     # saw → sor
    ('au',   'or'),     # haul → horl

    # Common word-chunk phonetic patterns
    ('ause',  'uz'),    # because → becuz
    ('ause',  'oz'),    # because → becoz
    ('cause', 'cuz'),   # because → becuz
    ('ould',  'ud'),    # could → cud, would → wud
    ('ight',  'ite'),   # night → nite, right → rite
    ('ough',  'of'),    # tough → tof
    ('ough',  'oo'),    # through → throo
    ('ough',  'ow'),    # though → thow

    # Suffix / ending patterns
    ('tion',  'shun'),  # station → stashun
    ('ture',  'cher'),  # nature → nacher
    ('sion',  'zhun'),  # vision → vizhun
    ('ous',   'us'),    # famous → famus
    ('ful',   'fool'),  # careful → carfool
    ('ed',    'd'),     # jumped → jumpd
    ('ed',    't'),     # looked → lookt
    ('ing',   'en'),    # running → runen
    ('le',    'ul'),    # table → tabul
    ('er',    'a'),     # butter → butta
    ('ce',    's'),     # face → fas
    ('se',    'z'),     # because → becuz
    ('se',    's'),     # house → hous
]


def is_phonetic_error(reference: str, typed: str) -> bool:
    """
    Returns True if the error looks phonetic — the child wrote what
    they *heard* rather than the conventionally correct spelling.

    Strategy: apply each known phonetic substitution to the reference word.
    If any substitution produces exactly the typed word, it's phonetic.

    Args:
        reference: the correct target word
        typed:     what the child actually wrote

    Returns:
        True if a phonetic pattern matches
    """
    ref = reference.lower().strip()
    typ = typed.lower().strip()

    if ref == typ:
        return False

    for (correct, phonetic) in PHONETIC_PATTERNS:
        # Forward: correct spelling → phonetic spelling  (phone → fone)
        if ref.replace(correct, phonetic) == typ:
            return True
        # Reverse: phonetic spelling → correct (hypercorrection: fone → phone)
        if ref.replace(phonetic, correct) == typ:
            return True

    return False


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ANALYSIS FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def analyze_word(reference_word: str, typed_word: str) -> dict:
    """
    Core deliverable function for Week 1.

    Analyzes a single (reference, typed) word pair and classifies
    what kind of error (if any) the child made.

    Args:
        reference_word: the correct word the child was supposed to write
        typed_word:     what the child actually typed/wrote

    Returns:
        dict with keys:
          reference     (str)  — original reference word
          typed         (str)  — what the child typed
          correct       (bool) — True if no error
          edit_distance (int)  — Levenshtein distance
          is_reversal   (bool) — b/d or mirror-word reversal detected
          is_phonetic   (bool) — phonetic/sound-based error detected
          error_type    (str)  — one of: correct | reversal | phonetic |
                                         minor_typo | spelling_error |
                                         severe_misspelling

    Example:
        >>> analyze_word("phone", "fone")
        {
            "reference": "phone",
            "typed": "fone",
            "correct": False,
            "edit_distance": 2,
            "is_reversal": False,
            "is_phonetic": True,
            "error_type": "phonetic"
        }
    """
    ref = reference_word.strip().lower()
    typ = typed_word.strip().lower()

    # Case 1: Correct
    if ref == typ:
        return {
            "reference":     reference_word,
            "typed":         typed_word,
            "correct":       True,
            "edit_distance": 0,
            "is_reversal":   False,
            "is_phonetic":   False,
            "error_type":    "correct"
        }

    # Compute all signals
    distance = levenshtein_distance(ref, typ)
    reversal = is_reversal(ref, typ)
    phonetic = is_phonetic_error(ref, typ)

    # Classify error type (priority: reversal > phonetic > distance-based)
    if reversal:
        error_type = "reversal"
    elif phonetic:
        error_type = "phonetic"
    elif distance == 1:
        error_type = "minor_typo"
    elif distance <= 3:
        error_type = "spelling_error"
    else:
        error_type = "severe_misspelling"

    return {
        "reference":     reference_word,
        "typed":         typed_word,
        "correct":       False,
        "edit_distance": distance,
        "is_reversal":   reversal,
        "is_phonetic":   phonetic,
        "error_type":    error_type
    }


def analyze_word_list(pairs: list) -> dict:
    """
    Runs analyze_word() over a full list of (reference, typed) pairs
    and returns aggregated counts — this is what Rewa's ML model needs.

    Args:
        pairs: list of (reference_word, typed_word) tuples

    Returns:
        dict with:
          total_words        (int)
          correct_count      (int)
          reversal_count     (int)
          phonetic_count     (int)
          spelling_error_count (int)
          error_rate         (float)
          reversal_rate      (float)
          phonetic_error_rate (float)
          details            (list of per-word result dicts)

    This output maps directly to the team schema's text_features field.
    """
    details = [analyze_word(ref, typ) for ref, typ in pairs]
    total = len(details)
    errors = [d for d in details if not d["correct"]]

    reversal_count = sum(1 for d in details if d["is_reversal"])
    phonetic_count = sum(1 for d in details if d["is_phonetic"])
    correct_count  = sum(1 for d in details if d["correct"])
    spelling_count = sum(1 for d in details
                         if not d["correct"]
                         and not d["is_reversal"]
                         and not d["is_phonetic"])

    return {
        "total_words":           total,
        "correct_count":         correct_count,
        "reversal_count":        reversal_count,
        "phonetic_count":        phonetic_count,
        "spelling_error_count":  spelling_count,
        "error_rate":            round(len(errors) / total, 3) if total else 0.0,
        "reversal_rate":         round(reversal_count / total, 3) if total else 0.0,
        "phonetic_error_rate":   round(phonetic_count / total, 3) if total else 0.0,
        "details":               details
    }


# ─────────────────────────────────────────────────────────────────────────────
# TEST RUNNER  (python text_analyzer.py)
# ─────────────────────────────────────────────────────────────────────────────

TEST_CASES = [
    # (reference,    typed,        expected_error_type,  note)
    ("dog",          "bog",        "reversal",           "d→b letter reversal"),
    ("bed",          "ded",        "reversal",           "b→d reversal in middle"),
    ("was",          "saw",        "reversal",           "whole-word mirror: was↔saw"),
    ("phone",        "fone",       "phonetic",           "ph→f phonetic error"),
    ("because",      "becuz",      "phonetic",           "se→z phonetic ending"),
    ("beautiful",    "butiful",    "spelling_error",     "multi-char spelling error"),
    ("people",       "pepol",      "spelling_error",     "vowel confusion"),
    ("friend",       "freind",     "spelling_error",     "letter transposition"),
    ("cat",          "cat",        "correct",            "correct — no error"),
    ("bridge",       "brige",      "minor_typo",         "one char dropped"),
]


if __name__ == "__main__":
    import json

    print("=" * 65)
    print("LEXORA — Text/NLP Analyzer | Meraiah | Week 1 Deliverable")
    print("=" * 65)

    passed = 0
    failed = 0

    for ref, typed, expected_type, note in TEST_CASES:
        result = analyze_word(ref, typed)
        status = "✓" if result["error_type"] == expected_type else "✗"
        if status == "✓":
            passed += 1
        else:
            failed += 1

        print(f"\n[{note}]  {status}")
        print(f"  Reference : '{ref}'")
        print(f"  Typed     : '{typed}'")
        print(f"  Output    :")
        print(json.dumps(result, indent=6))

    print()
    print("=" * 65)
    print(f"Results: {passed} passed, {failed} failed out of {len(TEST_CASES)} tests")
    if failed == 0:
        print("All tests passed ✓  — Week 1 deliverable complete.")
    else:
        print("Some tests failed — check the cases marked ✗ above.")
    print("=" * 65)

    # Also show the aggregated output (what Rewa's model will consume)
    print()
    print("Aggregated output from analyze_word_list():")
    pairs = [(ref, typed) for ref, typed, _, _ in TEST_CASES]
    summary = analyze_word_list(pairs)
    # Print without the per-word details for readability
    summary_clean = {k: v for k, v in summary.items() if k != "details"}
    print(json.dumps(summary_clean, indent=2))
