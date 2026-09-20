from lexora_nlp import analyze_text, classify_word_error, levenshtein, normalize_text, phonetically_similar


def test_normalize_strips_punctuation_and_case():
    assert normalize_text("  This is a Small bag. ") == "this is a small bag"
    assert normalize_text("What is the time?") == "what is the time"


def test_levenshtein_basic():
    assert levenshtein("kitten", "sitting") == 3
    assert levenshtein("", "abc") == 3


def test_reversal_and_transposition_patterns():
    assert "mirror_letter_reversal" in classify_word_error("bad", "dad")["patterns"]
    assert "sequence_reversal" in classify_word_error("was", "saw")["patterns"]
    assert "letter_transposition" in classify_word_error("form", "from")["patterns"]


def test_omission_and_phonetic_patterns():
    r = classify_word_error("running", "runing")
    assert "letter_omission" in r["patterns"] and r["phonetic_plausible"]
    assert phonetically_similar("said", "sed")
    assert not phonetically_similar("cat", "dog")


def test_analyze_text_counts():
    r = analyze_text("This is a small bag. I like to read.", "this is small bag bag I lik to reed")
    assert r["total_words"] == 9
    assert r["omission_count"] == 1 and r["addition_count"] == 1
    assert r["spelling_error_count"] == 2
    assert r["repetition_count"] == 1
    assert 0 < r["word_error_rate"] < 1


def test_identical_text_has_no_errors():
    r = analyze_text("I have a fat cat.", "I have a fat cat")
    assert r["word_error_rate"] == 0 and r["accuracy"] == 1.0 and r["word_errors"] == []
