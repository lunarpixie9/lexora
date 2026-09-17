"""
test_pipeline.py — Meraiah | Lexora Text/NLP Pipeline | Week 4

Full test suite for the entire text pipeline.
Run with: python test_pipeline.py

Tests every layer:
  - edit_distance.py
  - text_analyzer.py
  - sentence_analyzer.py
  - session_processor.py
  - lexora_text_api.py
"""

from edit_distance import levenshtein_distance
from text_analyzer import analyze_word, analyze_word_list
from sentence_analyzer import analyze_sentence, sounds_like
from lexora_text_api import analyse_session, get_risk_indicators


# ─────────────────────────────────────────────────────────────────────────────
# TEST HELPERS
# ─────────────────────────────────────────────────────────────────────────────

passed = 0
failed = 0


def check(description: str, condition: bool):
    global passed, failed
    if condition:
        print(f"  ✓  {description}")
        passed += 1
    else:
        print(f"  ✗  {description}  ← FAILED")
        failed += 1


def section(title: str):
    print(f"\n── {title} ──")


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 1: EDIT DISTANCE
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 1: Edit Distance")

check("identical words = 0",        levenshtein_distance("cat", "cat") == 0)
check("one substitution = 1",       levenshtein_distance("cat", "bat") == 1)
check("one insertion = 1",          levenshtein_distance("cat", "cart") == 1)
check("one deletion = 1",           levenshtein_distance("cat", "ca") == 1)
check("empty vs word = word length", levenshtein_distance("", "hello") == 5)
check("case insensitive",           levenshtein_distance("Cat", "cat") == 0)
check("phone vs fone = 2",          levenshtein_distance("phone", "fone") == 2)


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 2: WORD ANALYZER — REVERSALS
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 2: Word Analyzer — Reversals")

r1 = analyze_word("dog", "bog")
check("dog→bog detected as reversal",       r1["is_reversal"] == True)
check("dog→bog error_type = reversal",      r1["error_type"] == "reversal")

r2 = analyze_word("was", "saw")
check("was→saw whole-word reversal",        r2["is_reversal"] == True)

r3 = analyze_word("bed", "ded")
check("bed→ded b/d reversal",              r3["is_reversal"] == True)

r4 = analyze_word("cat", "cat")
check("cat→cat correct, no reversal",       r4["correct"] == True and r4["is_reversal"] == False)


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 2: WORD ANALYZER — PHONETIC
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 2: Word Analyzer — Phonetic Errors")

p1 = analyze_word("phone", "fone")
check("phone→fone detected as phonetic",    p1["is_phonetic"] == True)
check("phone→fone error_type = phonetic",   p1["error_type"] == "phonetic")

p2 = analyze_word("because", "becuz")
check("because→becuz phonetic ending",      p2["is_phonetic"] == True)

p3 = analyze_word("bridge", "brige")
check("bridge→brige = minor_typo",          p3["error_type"] == "minor_typo")


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 2: WORD LIST AGGREGATION
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 2: Word List Aggregation")

pairs = [
    ("dog",    "bog"),
    ("phone",  "fone"),
    ("cat",    "cat"),
    ("friend", "freind"),
    ("was",    "saw"),
]
agg = analyze_word_list(pairs)

check("total_words = 5",              agg["total_words"] == 5)
check("correct_count = 1",           agg["correct_count"] == 1)
check("reversal_count = 2",          agg["reversal_count"] == 2)
check("phonetic_count = 1",          agg["phonetic_count"] == 1)
check("error_rate = 0.8",            agg["error_rate"] == 0.8)


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3: METAPHONE SOUND MATCHING
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 3: Metaphone Sound Matching")

check("phone/fone sound alike",       sounds_like("phone", "fone") == True)
check("knight/nite sound alike",      sounds_like("knight", "nite") == True)
check("cat/bat do NOT sound alike",   sounds_like("cat", "bat") == False)
check("identical words → False",      sounds_like("cat", "cat") == False)


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 3: SENTENCE ANALYZER
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 3: Sentence Analyzer")

s1 = analyze_sentence("The dog sat on the mat", "The bog sat on the mat")
check("sentence reversal detected",        s1["reversal_count"] == 1)
check("sentence correct_count = 5",        s1["correct_count"] == 5)
check("sentence similarity > 90",          s1["overall_similarity"] > 90)
check("sentence word_count = 6",           s1["word_count"] == 6)

s2 = analyze_sentence("She went to the phone box", "She went to the fone box")
check("sentence phonetic detected",        s2["phonetic_count"] == 1)
check("sentence no reversals",             s2["reversal_count"] == 0)

s3 = analyze_sentence("The cat sat", "The cat")
check("omission detected",                 s3["omission_count"] == 1)


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 4: FULL SESSION + TEAM SCHEMA
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 4: Full Session & Team Schema")

session = analyse_session(
    child_id="test_child",
    reading_reference="The dog ran fast. She was happy.",
    reading_typed="The bog ran fast. She saw happy.",
    spelling_pairs=[("phone", "fone"), ("cat", "cat"), ("was", "saw")],
    phonics_pairs=[("knight", "nite"), ("cat", "cat")]
)

tf = session["text_features"]
check("session_id generated",              len(session["session_id"]) > 0)
check("child_id correct",                  session["child_id"] == "test_child")
check("text_features present",             "text_features" in session)
check("reversal_count is int",             isinstance(tf["reversal_count"], int))
check("phonetic_error_rate is float",      isinstance(tf["phonetic_error_rate"], float))
check("omission_count is int",             isinstance(tf["omission_count"], int))
check("transposition_count is int",        isinstance(tf["transposition_count"], int))
check("reversal_count > 0",               tf["reversal_count"] > 0)
check("debug section present",             "debug" in session)
check("per_task_summary present",          "per_task_summary" in session["debug"])


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 4: RISK INDICATORS
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 4: Risk Indicators")

# High risk session
high_risk_session = {
    "text_features": {
        "reversal_count": 5,
        "phonetic_error_rate": 0.35,
        "omission_count": 4,
        "transposition_count": 3
    }
}
hi = get_risk_indicators(high_risk_session)
check("high reversal → reversal_risk True",     hi["reversal_risk"] == True)
check("high phonetic → phonetic_risk True",     hi["phonetic_risk"] == True)
check("high omission → omission_risk True",     hi["omission_risk"] == True)
check("4 flags → overall_risk_level = High",    hi["overall_risk_level"] == "High")

# Low risk session
low_risk_session = {
    "text_features": {
        "reversal_count": 0,
        "phonetic_error_rate": 0.05,
        "omission_count": 0,
        "transposition_count": 0
    }
}
lo = get_risk_indicators(low_risk_session)
check("low scores → overall_risk_level = Low",  lo["overall_risk_level"] == "Low")
check("low scores → no flags",                  lo["flags"] == [])


# ─────────────────────────────────────────────────────────────────────────────
# LAYER 4: INPUT VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

section("Layer 4: Input Validation")

try:
    analyse_session("", "ref", "typed", [], [])
    check("empty child_id raises ValueError", False)
except ValueError:
    check("empty child_id raises ValueError", True)

try:
    analyse_session("child_x", "", "", [], [])
    check("all empty tasks raises ValueError", False)
except ValueError:
    check("all empty tasks raises ValueError", True)


# ─────────────────────────────────────────────────────────────────────────────
# FINAL RESULTS
# ─────────────────────────────────────────────────────────────────────────────

total = passed + failed
print("\n" + "=" * 65)
print(f"LEXORA Text Pipeline — Test Suite Results")
print(f"  {passed} passed  |  {failed} failed  |  {total} total")
if failed == 0:
    print("  All tests passed ✓ — Week 4 complete. Pipeline ready for integration.")
else:
    print(f"  {failed} test(s) failed ✗ — check the lines marked above.")
print("=" * 65)