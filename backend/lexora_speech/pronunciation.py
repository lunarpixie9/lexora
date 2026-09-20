"""Pronunciation analysis: what sounds were actually produced?

Whisper (and every word-level recogniser that works on accented, noisy speech)
carries a language model that quietly *repairs* mispronunciations towards fluent
English - "he as a blue shit" becomes "he has a blue shirt" - which hides exactly
the signals a literacy screener wants. This module adds a second, independent
listener: a multilingual **phoneme** recogniser (wav2vec2-XLSR fine-tuned on
CommonVoice phonemes, no language model) whose output is compared, sound by
sound, with the dictionary pronunciation of the prompt.

The comparison is deliberately accent-tolerant: Indian-English realisations
such as /v/ for /w/, /t/ for /th/, /d/ for /dh/ and vowel-length differences
are NOT counted as errors. Each expected word gets a 0-1 mismatch score; words
above a threshold are flagged as "possible mispronunciation" for the teacher.

Everything is optional: if the model or its dependencies are missing the
feature simply reports `available: False` and the rest of Lexora is unaffected.
"""
from __future__ import annotations

import json
import logging
import re
import threading
import unicodedata
from dataclasses import dataclass

log = logging.getLogger("lexora.pronunciation")

DEFAULT_MODEL = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"

# ---------------------------------------------------------------------------
# Canonical phoneme classes. Both the dictionary (ARPAbet) and the recogniser
# (espeak IPA) are mapped onto these before alignment.
# ---------------------------------------------------------------------------
ARPA_TO_CLASS = {
    "P": "p", "B": "b", "T": "t", "D": "d", "K": "k", "G": "g", "CH": "tS", "JH": "dZ",
    "F": "f", "V": "v", "TH": "T", "DH": "D", "S": "s", "Z": "z", "SH": "S", "ZH": "Z",
    "HH": "h", "M": "m", "N": "n", "NG": "N", "L": "l", "R": "r", "W": "w", "Y": "j",
    "IY": "I", "IH": "I", "EY": "EY", "EH": "E", "AE": "A", "AA": "A", "AH": "A", "AO": "O",
    "OW": "OW", "UH": "U", "UW": "U", "ER": "R", "AY": "AY", "AW": "AW", "OY": "OY",
}
IPA_TO_CLASS = {
    "p": "p", "b": "b", "t": "t", "d": "d", "k": "k", "g": "g", "ɡ": "g", "tʃ": "tS", "dʒ": "dZ",
    "f": "f", "v": "v", "θ": "T", "ð": "D", "s": "s", "z": "z", "ʃ": "S", "ʒ": "Z", "h": "h",
    "m": "m", "n": "n", "ŋ": "N", "l": "l", "r": "r", "ɹ": "r", "ɾ": "r", "ɻ": "r", "w": "w", "j": "j",
    "x": "k", "ç": "h", "ʔ": "t", "q": "k", "c": "k",
    "i": "I", "ɪ": "I", "ɨ": "I", "y": "I", "e": "E", "ɛ": "E", "æ": "A", "a": "A", "ɑ": "A",
    "ɐ": "A", "ʌ": "A", "ɒ": "O", "ɔ": "O", "o": "OW", "oʊ": "OW", "ʊ": "U", "u": "U", "ɯ": "U",
    "ɜ": "R", "ə": "R", "ɚ": "R", "ɝ": "R", "aɪ": "AY", "aʊ": "AW", "ɔɪ": "OY", "eɪ": "EY",
    "ɪə": "I", "eə": "E", "ʊə": "U", "əʊ": "OW", "ɛɪ": "EY",
}
VOWELS = {"I", "E", "A", "O", "U", "R", "AY", "AW", "OY", "EY", "OW"}

# Substitutions that cost nothing (typical Indian-English realisations) ...
FREE_PAIRS = {frozenset(p) for p in [("v", "w"), ("T", "t"), ("D", "d"), ("s", "z"), ("Z", "dZ"), ("S", "Z")]}
# ... and ones that cost half (close vowels / related sounds)
HALF_PAIRS = {frozenset(p) for p in [
    ("I", "E"), ("E", "EY"), ("A", "R"), ("A", "E"), ("O", "OW"), ("O", "A"), ("U", "OW"), ("R", "E"),
    ("AY", "A"), ("AW", "A"), ("OY", "O"), ("EY", "I"), ("U", "R"), ("p", "b"), ("t", "d"), ("k", "g"),
    ("f", "v"), ("f", "p"), ("dZ", "z"), ("tS", "S"), ("n", "N"), ("m", "n"),
]}

LETTER_NAMES_ARPA = {
    "a": "EY", "b": "B IY", "c": "S IY", "d": "D IY", "e": "IY", "f": "EH F", "g": "JH IY", "h": "EY CH",
    "i": "AY", "j": "JH EY", "k": "K EY", "l": "EH L", "m": "EH M", "n": "EH N", "o": "OW", "p": "P IY",
    "q": "K Y UW", "r": "AA R", "s": "EH S", "t": "T IY", "u": "Y UW", "v": "V IY", "w": "D AH B AH L Y UW",
    "x": "EH K S", "y": "W AY", "z": "Z EH D",
}


def _strip_ipa(tok: str) -> str:
    tok = unicodedata.normalize("NFD", tok)
    tok = "".join(ch for ch in tok if not unicodedata.combining(ch) and ch not in "ːˈˌ˞̩ʲʰ")
    return unicodedata.normalize("NFC", tok)


def ipa_tokens_to_classes(tokens: list[str]) -> list[str]:
    out = []
    for raw in tokens:
        tok = _strip_ipa(raw)
        if not tok or tok in ("|", "<s>", "</s>", "<unk>", "<pad>"):
            continue
        if tok in IPA_TO_CLASS:
            out.append(IPA_TO_CLASS[tok])
            continue
        # unknown multi-char token: try char by char
        for ch in tok:
            if ch in IPA_TO_CLASS:
                out.append(IPA_TO_CLASS[ch])
    return out


def arpa_to_classes(arpa: list[str] | str) -> list[str]:
    toks = arpa.split() if isinstance(arpa, str) else arpa
    return [ARPA_TO_CLASS[re.sub(r"\d", "", t)] for t in toks if re.sub(r"\d", "", t) in ARPA_TO_CLASS]


_cmu = None


def expected_pronunciations(word: str, is_letter: bool = False) -> list[list[str]]:
    """All dictionary pronunciations of a word as class sequences (empty if unknown)."""
    global _cmu
    w = word.lower()
    if is_letter:
        return [arpa_to_classes(LETTER_NAMES_ARPA[w])] if w in LETTER_NAMES_ARPA else []
    if _cmu is None:
        try:
            import cmudict

            _cmu = cmudict.dict()
        except Exception as exc:  # pragma: no cover
            log.warning("cmudict unavailable: %s", exc)
            _cmu = {}
    prons = _cmu.get(w) or []
    return [arpa_to_classes(p) for p in prons] or []


def _sub_cost(a: str, b: str) -> float:
    if a == b:
        return 0.0
    pair = frozenset((a, b))
    if pair in FREE_PAIRS:
        return 0.0
    if pair in HALF_PAIRS:
        return 0.5
    return 1.0


@dataclass
class WordScore:
    word: str
    expected: list[str]
    heard: list[str]
    error: float  # 0 = perfect, 1 = nothing matched
    flagged: bool


def align_words(expected_words: list[tuple[str, list[str]]], heard: list[str]) -> tuple[list[WordScore], float]:
    """Weighted edit-distance alignment of the concatenated expected phonemes against
    the heard phonemes; costs are attributed back to the expected word they fall in."""
    exp_seq: list[str] = []
    owner: list[int] = []
    for wi, (_, ph) in enumerate(expected_words):
        exp_seq += ph
        owner += [wi] * len(ph)
    n, m = len(exp_seq), len(heard)
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        D[i][0] = i
    for j in range(1, m + 1):
        D[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + _sub_cost(exp_seq[i - 1], heard[j - 1]))
    # backtrace, attributing cost and heard phonemes to words
    cost = [0.0] * len(expected_words)
    heard_by_word: list[list[str]] = [[] for _ in expected_words]
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and abs(D[i][j] - (D[i - 1][j - 1] + _sub_cost(exp_seq[i - 1], heard[j - 1]))) < 1e-9:
            cost[owner[i - 1]] += _sub_cost(exp_seq[i - 1], heard[j - 1])
            heard_by_word[owner[i - 1]].insert(0, heard[j - 1])
            i, j = i - 1, j - 1
        elif i > 0 and abs(D[i][j] - (D[i - 1][j] + 1)) < 1e-9:
            cost[owner[i - 1]] += 1
            i -= 1
        else:
            wi = owner[i - 1] if i > 0 else len(expected_words) - 1
            cost[wi] += 0.5  # extra sound: half weight, often hesitation/noise
            heard_by_word[wi].insert(0, heard[j - 1])
            j -= 1
    scores = []
    for wi, (word, ph) in enumerate(expected_words):
        err = min(1.0, cost[wi] / max(len(ph), 1))
        threshold = 0.30 if len(ph) >= 3 else 0.5  # one dropped consonant in a 3-sound word is flagged
        scores.append(WordScore(word, ph, heard_by_word[wi], round(err, 3), err >= threshold))
    total_exp = max(len(exp_seq), 1)
    per = min(1.0, D[n][m] / total_exp)
    return scores, round(per, 3)


def score_pronunciation(prompt_words: list[str], heard_classes: list[str], is_letter: bool = False) -> dict:
    """Compare heard phoneme classes with the best-matching dictionary pronunciation
    of each prompt word. Words missing from the dictionary are skipped."""
    expected: list[tuple[str, list[str]]] = []
    unknown = []
    for w in prompt_words:
        prons = expected_pronunciations(w, is_letter)
        if not prons:
            unknown.append(w)
            continue
        # choose the pronunciation variant that best matches what was heard, greedily
        best = min(prons, key=lambda p: align_words([(w, p)], heard_classes)[1]) if len(prons) > 1 else prons[0]
        expected.append((w, best))
    if not expected:
        return {"available": True, "scored": False, "unknown_words": unknown}
    scores, per = align_words(expected, heard_classes)
    return {
        "available": True,
        "scored": True,
        "phoneme_error_rate": per,
        "words": [{"word": s.word, "expected": " ".join(s.expected), "heard": " ".join(s.heard),
                   "error": s.error, "flagged": s.flagged} for s in scores],
        "flagged_words": [s.word for s in scores if s.flagged],
        "unknown_words": unknown,
    }


class PhonemeRecognizer:
    """wav2vec2-XLSR phoneme CTC model, greedy decoded, optionally int8-quantised."""

    def __init__(self, model_name: str = DEFAULT_MODEL, quantize: bool = True):
        import torch
        from huggingface_hub import hf_hub_download
        from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

        self.name = model_name
        self._fe = Wav2Vec2FeatureExtractor.from_pretrained(model_name)
        model = Wav2Vec2ForCTC.from_pretrained(model_name).eval()
        if quantize:
            model = torch.quantization.quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)
        self._model = model
        vocab = json.loads(open(hf_hub_download(model_name, "vocab.json"), encoding="utf-8").read())
        self._id2tok = {v: k for k, v in vocab.items()}
        self._pad = vocab.get("<pad>", 0)
        self._lock = threading.Lock()
        self.engine = f"{model_name.split('/')[-1]}{':int8' if quantize else ''}"

    def phonemes(self, samples, sample_rate: int = 16000) -> list[str]:
        import torch

        with self._lock, torch.no_grad():
            inputs = self._fe(samples, sampling_rate=sample_rate, return_tensors="pt")
            ids = torch.argmax(self._model(**inputs).logits, dim=-1)[0].tolist()
        out, prev = [], None
        for i in ids:
            if i != prev and i != self._pad:
                out.append(self._id2tok[i])
            prev = i
        return out


_recognizer: PhonemeRecognizer | None = None
_tried = False
_lock = threading.Lock()


def get_phoneme_recognizer(model_name: str | None) -> PhonemeRecognizer | None:
    """Lazily load once; None when disabled (empty name) or unavailable."""
    global _recognizer, _tried
    with _lock:
        if _recognizer is None and not _tried:
            _tried = True
            if not model_name:
                log.info("pronunciation model disabled")
                return None
            try:
                _recognizer = PhonemeRecognizer(model_name)
                log.info("loaded pronunciation model %s", _recognizer.engine)
            except Exception as exc:  # missing deps, no network for weights ...
                log.warning("pronunciation model unavailable (%s)", exc)
        return _recognizer


def analyse_pronunciation(samples, sample_rate: int, expected_text: str, level: str,
                          model_name: str | None) -> dict | None:
    """Full pipeline for one recording; returns None when the model is unavailable."""
    from lexora_nlp import tokenize

    rec = get_phoneme_recognizer(model_name)
    if rec is None:
        return None
    tokens = rec.phonemes(samples, sample_rate)
    heard = ipa_tokens_to_classes(tokens)
    is_letter = level in ("CL", "SL")
    words = [expected_text.strip()[:1]] if is_letter else tokenize(expected_text)
    result = score_pronunciation(words, heard, is_letter=is_letter)
    result["engine"] = rec.engine
    result["heard_ipa"] = " ".join(t for t in tokens if t not in ("|", "<s>", "</s>", "<unk>", "<pad>"))
    result["accent_tolerant"] = True
    return result
