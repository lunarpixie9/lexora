"""Text normalisation shared by the NLP and speech layers."""
import re
import unicodedata

_PUNCT = re.compile(r"[^\w\s']", re.UNICODE)
_SPACES = re.compile(r"\s+")

# Whisper writes numbers as digits; children's reading prompts spell them out.
_NUMBER_WORDS = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
    "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
}


def normalize_text(text: str) -> str:
    """Lower-case, strip accents/punctuation, collapse whitespace."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("’", "'")
    text = _PUNCT.sub(" ", text)
    text = _SPACES.sub(" ", text).strip()
    return " ".join(_NUMBER_WORDS.get(tok, tok) for tok in text.split(" ")) if text else ""


def tokenize(text: str) -> list[str]:
    norm = normalize_text(text)
    return norm.split(" ") if norm else []
