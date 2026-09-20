"""A compact phonetic key for English words.

This is a simplified Metaphone-style encoding: it collapses letters that sound
alike so that "said"/"sed", "night"/"nite" and "phone"/"fone" share a key. It
is deliberately small and readable rather than exhaustive; its job is to tell a
*phonetically plausible* misspelling apart from a random one.
"""
import re

_RULES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^kn|^gn|^pn|^wr"), lambda m: m.group(0)[1]),  # silent first letter
    (re.compile(r"^x"), "s"),
    (re.compile(r"ph"), "f"),
    (re.compile(r"gh(?![aeiou])"), ""),      # night, laugh -> handled loosely
    (re.compile(r"ck"), "k"),
    (re.compile(r"c(?=[eiy])"), "s"),
    (re.compile(r"c"), "k"),
    (re.compile(r"q"), "k"),
    (re.compile(r"x"), "ks"),
    (re.compile(r"sh|tio|cia|sio"), "x"),    # 'sh' sound
    (re.compile(r"ch"), "x"),
    (re.compile(r"dg(?=[eiy])"), "j"),
    (re.compile(r"g(?=[eiy])"), "j"),
    (re.compile(r"th"), "0"),
    (re.compile(r"wh"), "w"),
    (re.compile(r"z"), "s"),
    (re.compile(r"v"), "f"),
    (re.compile(r"d"), "t"),
    (re.compile(r"b$"), ""),                 # lamb, comb
    (re.compile(r"mb$"), "m"),
    (re.compile(r"e$"), ""),                 # silent final e
]


def phonetic_key(word: str) -> str:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return ""
    for pattern, repl in _RULES:
        w = pattern.sub(repl, w)
    # collapse doubled letters, then drop non-initial vowels
    w = re.sub(r"(.)\1+", r"\1", w)
    if len(w) > 1:
        w = w[0] + re.sub(r"[aeiouyhw]", "", w[1:])
    return w


def phonetically_similar(a: str, b: str) -> bool:
    ka, kb = phonetic_key(a), phonetic_key(b)
    if not ka or not kb:
        return False
    if ka == kb:
        return True
    # allow one edit in longer keys (e.g. 'becos' vs 'because')
    if len(ka) >= 3 and len(kb) >= 3:
        from .alignment import levenshtein

        return levenshtein(ka, kb) <= 1
    return False
