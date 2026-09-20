"""Edit-distance alignment at character and word level.

`levenshtein` is the plain distance. `align_*` return the edit script as a list
of (op, expected_item, actual_item) tuples where op is one of
"equal", "substitute", "insert" (extra item in actual), "delete" (item missing
from actual). Word alignment uses character similarity so that a misspelt word
is reported as a substitution rather than a delete + insert pair.
"""
from __future__ import annotations

from collections.abc import Sequence


def levenshtein(a: Sequence, b: Sequence) -> int:
    if len(a) < len(b):
        a, b = b, a
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ca != cb)))
        previous = current
    return previous[-1]


def char_similarity(a: str, b: str) -> float:
    """1.0 for identical strings, 0.0 for nothing in common."""
    if not a and not b:
        return 1.0
    longest = max(len(a), len(b))
    return 1.0 - levenshtein(a, b) / longest


def _align(expected: Sequence, actual: Sequence, cost_sub) -> list[tuple[str, object, object]]:
    n, m = len(expected), len(actual)
    dist = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        dist[i][0] = i
    for j in range(1, m + 1):
        dist[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            dist[i][j] = min(
                dist[i - 1][j] + 1,
                dist[i][j - 1] + 1,
                dist[i - 1][j - 1] + cost_sub(expected[i - 1], actual[j - 1]),
            )
    ops: list[tuple[str, object, object]] = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            c = cost_sub(expected[i - 1], actual[j - 1])
            if abs(dist[i][j] - (dist[i - 1][j - 1] + c)) < 1e-9:
                ops.append(("equal" if c == 0 else "substitute", expected[i - 1], actual[j - 1]))
                i, j = i - 1, j - 1
                continue
        if i > 0 and abs(dist[i][j] - (dist[i - 1][j] + 1)) < 1e-9:
            ops.append(("delete", expected[i - 1], None))
            i -= 1
        else:
            ops.append(("insert", None, actual[j - 1]))
            j -= 1
    ops.reverse()
    return ops


def align_chars(expected: str, actual: str) -> list[tuple[str, object, object]]:
    return _align(expected, actual, lambda x, y: 0 if x == y else 1)


def align_words(expected: list[str], actual: list[str]) -> list[tuple[str, object, object]]:
    """Word-level alignment. Substituting two words costs less than delete+insert
    when they look alike, so 'hose' for 'house' aligns as one substitution."""

    def cost(x: str, y: str) -> float:
        if x == y:
            return 0
        sim = char_similarity(x, y)
        # A look-alike pair (1.0) is preferred over a dissimilar pair (1.6); both
        # still beat delete+insert (2.0), so a wrong word at the right position
        # counts as one substitution, as in word-error-rate scoring.
        return 1.0 if sim >= 0.5 else 1.6

    return _align(expected, actual, cost)
