"""
lexora_text_api.py — Meraiah | Lexora Text/NLP Pipeline | Week 4

The single entry point for Prashasti's FastAPI backend.
She imports ONE function: analyse_session()

Usage from backend:
    from text_pipeline.lexora_text_api import analyse_session

    result = analyse_session(
        child_id="child_001",
        reading_reference="The dog ran to the park.",
        reading_typed="The bog ran to the park.",
        spelling_pairs=[("because", "becuz"), ("friend", "freind")],
        phonics_pairs=[("knight", "nite"), ("write", "rite")]
    )

Returns the exact team schema dict — ready to save to the database.
"""

from session_processor import process_session


def analyse_session(
    child_id: str,
    reading_reference: str,
    reading_typed: str,
    spelling_pairs: list,
    phonics_pairs: list,
    session_id: str = None
) -> dict:
    """
    Main entry point for the Lexora text analysis pipeline.

    Called by Prashasti's FastAPI backend after a child completes
    a session. Returns the team schema JSON ready for the database
    and Rewa's ML model.

    Args:
        child_id           — unique child identifier (string)
        reading_reference  — the correct passage text (string)
        reading_typed      — what the child typed (string)
        spelling_pairs     — list of (reference, typed) word tuples
        phonics_pairs      — list of (reference, typed) word tuples
        session_id         — optional string; auto-generated if omitted

    Returns:
        dict matching the team schema:
        {
            "session_id": "...",
            "child_id": "...",
            "text_features": {
                "reversal_count": int,
                "phonetic_error_rate": float,
                "omission_count": int,
                "transposition_count": int
            },
            "debug": { ... }   ← full details for dashboard
        }

    Raises:
        ValueError if child_id is empty or both task lists are empty
    """
    # Input validation
    if not child_id or not child_id.strip():
        raise ValueError("child_id cannot be empty")

    if not reading_reference and not spelling_pairs and not phonics_pairs:
        raise ValueError("At least one task must have data")

    # Use empty strings/lists as defaults for missing tasks
    reading_reference = reading_reference or ""
    reading_typed     = reading_typed or ""
    spelling_pairs    = spelling_pairs or []
    phonics_pairs     = phonics_pairs or []

    return process_session(
        child_id=child_id.strip(),
        reading_reference=reading_reference,
        reading_typed=reading_typed,
        spelling_pairs=spelling_pairs,
        phonics_pairs=phonics_pairs,
        session_id=session_id
    )


def get_risk_indicators(session_result: dict) -> dict:
    """
    Converts raw text features into simple risk indicators.
    Gives Prashasti's backend easy flags to display on the dashboard.

    Risk thresholds (conservative — this is a screening tool, not diagnosis):
      reversal_count     >= 3   → reversal risk flagged
      phonetic_error_rate >= 0.2 → phonetic risk flagged
      omission_count     >= 3   → omission risk flagged
      transposition_count >= 2  → transposition risk flagged

    Returns:
        {
            "reversal_risk":      bool,
            "phonetic_risk":      bool,
            "omission_risk":      bool,
            "transposition_risk": bool,
            "overall_risk_level": "Low" | "Medium" | "High",
            "flags":              [list of triggered risk strings]
        }
    """
    tf = session_result.get("text_features", {})

    reversal_risk      = tf.get("reversal_count", 0) >= 3
    phonetic_risk      = tf.get("phonetic_error_rate", 0.0) >= 0.2
    omission_risk      = tf.get("omission_count", 0) >= 3
    transposition_risk = tf.get("transposition_count", 0) >= 2

    flags = []
    if reversal_risk:      flags.append("High reversal frequency")
    if phonetic_risk:      flags.append("High phonetic error rate")
    if omission_risk:      flags.append("Frequent word omissions")
    if transposition_risk: flags.append("Frequent letter transpositions")

    risk_count = sum([reversal_risk, phonetic_risk, omission_risk, transposition_risk])
    if risk_count == 0:
        overall = "Low"
    elif risk_count <= 2:
        overall = "Medium"
    else:
        overall = "High"

    return {
        "reversal_risk":      reversal_risk,
        "phonetic_risk":      phonetic_risk,
        "omission_risk":      omission_risk,
        "transposition_risk": transposition_risk,
        "overall_risk_level": overall,
        "flags":              flags
    }


if __name__ == "__main__":
    import json

    print("=" * 65)
    print("LEXORA — Text API | Meraiah | Week 4 — API Module Test")
    print("=" * 65)

    result = analyse_session(
        child_id="child_demo",
        reading_reference="The dog ran to the park. She was very happy.",
        reading_typed="The bog ran to the park. She saw very happy.",
        spelling_pairs=[
            ("because", "becuz"),
            ("friend",  "freind"),
            ("phone",   "fone"),
            ("cat",     "cat"),
        ],
        phonics_pairs=[
            ("knight", "nite"),
            ("dog",    "bog"),
            ("cat",    "cat"),
        ]
    )

    indicators = get_risk_indicators(result)

    print("\n── Team Schema Output ──")
    schema = {k: v for k, v in result.items() if k != "debug"}
    print(json.dumps(schema, indent=2))

    print("\n── Risk Indicators ──")
    print(json.dumps(indicators, indent=2))

    print("\n── Per-task Summary ──")
    for task, summary in result["debug"]["per_task_summary"].items():
        print(f"  {task.capitalize():10} : {summary}")

    print("\n" + "=" * 65)
    print("lexora_text_api.py — API module working correctly.")
    print("=" * 65)