import math

from lexora_ml.aser_features import FEATURE_NAMES, feature_vector, rule_based_level, session_features
from lexora_ml.indicator import compute_indicator
from lexora_ml.reading_level import expected_level_for_class, predict_reading_level


def _items(cl=5, sl=None, w=None, s=None):
    """Ladder items: n correct per level; None = level not attempted."""
    out = []
    for lvl, n_ok, n_total in (("CL", cl, 5), ("SL", sl, 5), ("W", w, 5), ("S", s, 4)):
        if n_ok is None:
            continue
        for i in range(n_total):
            out.append({"level": lvl, "correct": i < n_ok, "mistakes": 0 if i < n_ok else 1, "seconds": 2.0})
    return out


def test_session_features_shape_and_nan_for_unreached_levels():
    f = session_features(_items(cl=5, sl=3), class_grade=3)
    assert len(feature_vector(f)) == len(FEATURE_NAMES)
    assert f["accuracy_CL"] == 1.0 and f["accuracy_SL"] == 0.6
    assert math.isnan(f["accuracy_W"]) and f["attempted_W"] == 0.0


def test_rule_based_ladder():
    assert rule_based_level(session_features(_items(cl=5, sl=5, w=5, s=4), 5)) == "Sentence"
    assert rule_based_level(session_features(_items(cl=5, sl=3), 3)) == "Capital letter"
    assert rule_based_level(session_features(_items(cl=2), 1)) == "Beginner"


def test_model_prediction_is_sensible_and_explained():
    strong = predict_reading_level(session_features(_items(cl=5, sl=5, w=5, s=4), 6), 6)
    weak = predict_reading_level(session_features(_items(cl=3), 6), 6)
    assert strong["level"] in ("word", "Sentence")
    assert weak["level"] in ("Beginner", "Capital letter")
    assert weak["gap_levels"] > strong["gap_levels"]
    if strong["probabilities"]:  # model artifact present
        assert abs(sum(strong["probabilities"].values()) - 1) < 1e-3
        assert strong["shap"] and all("label" in row for row in strong["shap"])


def test_expected_level_increases_with_class():
    order = ["Beginner", "Capital letter", "Small letter", "word", "Sentence"]
    assert order.index(expected_level_for_class(8)) >= order.index(expected_level_for_class(1))


def test_indicator_is_additive_and_banded():
    reading = {"level": "Capital letter", "expected_level_for_class": "word", "gap_levels": 2,
               "accuracy_CL": 0.6, "accuracy_SL": 0.4, "accuracy_W": None, "accuracy_S": None}
    writing = {"total_words": 8, "word_error_rate": 0.5, "spelling_error_count": 4, "omission_count": 0,
               "reversal_count": 2, "transposition_count": 0, "phonetic_error_count": 2, "letter_omission_count": 2}
    ind = compute_indicator(reading, writing, None)
    assert ind["band"] == "multiple_signals"
    assert abs(sum(s["contribution"] for s in ind["signals"]) - ind["score"]) < 1e-3
    assert abs(sum(s["weight"] for s in ind["signals"]) - 1) < 1e-6
    assert "speech" not in ind["groups_present"]
    assert compute_indicator(None, None, None)["band"] == "insufficient_data"


def test_practice_generator_survives_one_letter_missed_words():
    from app.services.practice import DeterministicGenerator

    acts = DeterministicGenerator().generate({"age": 7, "class_grade": 2},
                                             {"target_skills": ["clear_sounds"], "words_missed": ["i", "a", "is"], "patterns": {}}, seed=1)
    word_choice = next(a for a in acts if a.kind == "word_practice")
    assert word_choice.word_choice and all(len(i.options) >= 2 for i in word_choice.word_choice)
