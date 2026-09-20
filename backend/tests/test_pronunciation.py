"""Pure-function tests for the pronunciation layer (no model download)."""
from lexora_speech.pronunciation import (
    align_words, arpa_to_classes, expected_pronunciations, ipa_tokens_to_classes, score_pronunciation,
)


def test_dictionary_and_letter_pronunciations():
    assert arpa_to_classes("SH ER1 T") == ["S", "R", "t"]
    assert expected_pronunciations("shirt")[0] == ["S", "R", "t"]
    assert expected_pronunciations("b", is_letter=True) == [["b", "I"]]
    assert expected_pronunciations("qzxv") == []  # unknown word -> skipped, not crashed


def test_ipa_mapping_strips_length_and_stress():
    assert ipa_tokens_to_classes(["ʃ", "iː", "h", "æ", "z", "|", "ˈm", "a", "n", "iː"]) == \
        ["S", "I", "h", "A", "z", "m", "A", "n", "I"]


def test_accent_variants_are_free_but_dropped_consonants_are_not():
    # /v/ for /w/ and /d/ for /dh/ cost nothing (Indian English realisations)
    scores, per = align_words([("what", ["w", "A", "t"]), ("the", ["D", "A"])], ["v", "A", "t", "d", "A"])
    assert per == 0.0 and not any(s.flagged for s in scores)
    # "he as a blue shirt": the dropped /h/ of "has" is flagged, everything else is clean
    res = score_pronunciation(["he", "has", "a", "blue", "shirt"], ["h", "I", "A", "z", "A", "b", "l", "U", "S", "R", "t"])
    assert res["scored"] and res["flagged_words"] == ["has"]
    assert res["phoneme_error_rate"] < 0.15


def test_missing_and_garbled_words_are_flagged():
    res = score_pronunciation(["where", "is", "your", "house"], ["p", "A", "r", "k"])
    assert len(res["flagged_words"]) >= 3 and res["phoneme_error_rate"] > 0.6
