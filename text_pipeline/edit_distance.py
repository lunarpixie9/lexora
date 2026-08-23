"""
edit_distance.py — Meraiah | Lexora Text/NLP Pipeline | Week 1

Implements Levenshtein (edit) distance from scratch — no libraries used.
This is intentionally hand-built so you understand the algorithm before
using it inside the full analyzer.

What is edit distance?
  The minimum number of single-character operations (insert, delete,
  substitute) needed to turn one word into another.

  Examples:
    cat  → bat  = 1  (substitute c→b)
    cat  → cart = 1  (insert r)
    cat  → ca   = 1  (delete t)
    phone → fone = 2 (delete h, substitute p→f... or substitute ph→f)

How the algorithm works:
  We fill a 2D grid where grid[i][j] = minimum edits to turn
  the first i characters of word1 into the first j characters of word2.

  Base cases:
    grid[i][0] = i  (delete i characters to reach empty string)
    grid[0][j] = j  (insert j characters to build word from nothing)

  Recurrence:
    If characters match:  grid[i][j] = grid[i-1][j-1]  (no cost)
    If they differ:       grid[i][j] = 1 + min(
                              grid[i-1][j],    # deletion
                              grid[i][j-1],    # insertion
                              grid[i-1][j-1]   # substitution
                          )

  The answer is always in grid[len(word1)][len(word2)].
"""


def levenshtein_distance(word1: str, word2: str) -> int:
    """
    Returns the minimum edit distance between word1 and word2.
    Both words are lowercased before comparison.
    """
    word1 = word1.lower().strip()
    word2 = word2.lower().strip()

    rows = len(word1) + 1  # +1 for the empty-string base case
    cols = len(word2) + 1

    # Build empty grid
    grid = [[0] * cols for _ in range(rows)]

    # Fill base cases (first row and first column)
    for i in range(rows):
        grid[i][0] = i
    for j in range(cols):
        grid[0][j] = j

    # Fill the rest of the grid
    for i in range(1, rows):
        for j in range(1, cols):
            if word1[i - 1] == word2[j - 1]:
                # Characters match — carry diagonal value (zero extra cost)
                grid[i][j] = grid[i - 1][j - 1]
            else:
                # Characters differ — take cheapest operation + 1
                grid[i][j] = 1 + min(
                    grid[i - 1][j],      # deletion  (move up)
                    grid[i][j - 1],      # insertion (move left)
                    grid[i - 1][j - 1]   # substitution (move diagonal)
                )

    return grid[rows - 1][cols - 1]


def print_grid(word1: str, word2: str) -> None:
    """
    Prints the full edit-distance grid for visual understanding.
    Useful for learning — call this on any pair to see how the
    algorithm fills in the table.
    """
    word1 = word1.lower().strip()
    word2 = word2.lower().strip()

    rows = len(word1) + 1
    cols = len(word2) + 1
    grid = [[0] * cols for _ in range(rows)]

    for i in range(rows):
        grid[i][0] = i
    for j in range(cols):
        grid[0][j] = j

    for i in range(1, rows):
        for j in range(1, cols):
            if word1[i - 1] == word2[j - 1]:
                grid[i][j] = grid[i - 1][j - 1]
            else:
                grid[i][j] = 1 + min(
                    grid[i - 1][j],
                    grid[i][j - 1],
                    grid[i - 1][j - 1]
                )

    # Print header
    header = "    \"\"  " + "  ".join(f" {c}" for c in word2)
    print(header)
    print("   " + "-" * (len(header) - 3))

    # Print rows
    chars = ['""'] + list(word1)
    for i, row in enumerate(grid):
        label = f" {chars[i]} "
        print(label + "  ".join(f"{v:2}" for v in row))


# ── Self-test (runs when you execute: python edit_distance.py) ──────────────

if __name__ == "__main__":
    print("=" * 55)
    print("Edit Distance — Self Test")
    print("=" * 55)

    tests = [
        ("cat",       "cat",       0, "identical words"),
        ("cat",       "bat",       1, "one substitution"),
        ("cat",       "cart",      1, "one insertion"),
        ("cat",       "ca",        1, "one deletion"),
        ("phone",     "fone",      2, "ph→f error"),
        ("beautiful", "butiful",   2, "multiple errors"),
        ("because",   "becuz",     3, "phonetic ending"),
        ("friend",    "freind",    2, "letter swap"),
        ("",          "hello",     5, "empty vs word"),
        ("hello",     "",          5, "word vs empty"),
    ]

    all_passed = True
    for word1, word2, expected, note in tests:
        result = levenshtein_distance(word1, word2)
        status = "✓" if result == expected else f"✗ got {result}, expected {expected}"
        print(f"  '{word1}' vs '{word2}' [{note}] → {result}  {status}")
        if result != expected:
            all_passed = False

    print()
    print("All tests passed ✓" if all_passed else "Some tests FAILED ✗")

    # Show the grid for one example so you can see how it works
    print()
    print("Grid visualization for 'cat' vs 'bat':")
    print_grid("cat", "bat")
