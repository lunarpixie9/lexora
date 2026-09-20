"""Screening item bank.

Reading-ladder items are the real prompts used in the ASER English subtest
(letters, words and sentences; CC BY-NC-SA 4.0, cited in data/README.md), so a
Lexora screening produces the same feature vector the ASER-trained model was
fitted on. Writing and speech tasks reuse the same word and sentence pool.
"""
from __future__ import annotations

import random

ASER_CAPITAL_LETTERS = list("ABCDEFGHJKLMNOPQRSTVWXYZ")
ASER_SMALL_LETTERS = list("abdefghijkmnoprstuvwxyz")
ASER_WORDS = [
    "bag", "big", "box", "boy", "bus", "cat", "cow", "cup", "day", "dog", "fan", "fat", "fox",
    "hat", "hen", "hot", "lip", "man", "new", "old", "out", "pen", "rat", "red", "run", "sit",
    "sun", "wet",
]
ASER_SENTENCES = [
    "He has a blue shirt.", "I have a big house.", "I have a fat dog.", "I have a fat cat.",
    "I have a small house.", "I like to play.", "I like to read.", "I like to sing.",
    "I like to sleep.", "She has a green kite.", "She has a red dress.", "She has many books.",
    "This is a big bus.", "This is a blue shirt.", "This is a large house.", "This is a long road.",
    "This is a red ball.", "This is a small bag.", "This is a small door.", "This is a tall tree.",
    "What is the time?", "Where is your house?",
]

LADDER = [("CL", ASER_CAPITAL_LETTERS, 5), ("SL", ASER_SMALL_LETTERS, 5), ("W", ASER_WORDS, 5), ("S", ASER_SENTENCES, 4)]
LADDER_PASS_THRESHOLD = 0.8  # ASER moves a child up when at least 4 of 5 items are correct


def build_tasks(seed: int) -> list[dict]:
    """Return the ordered task list for one screening session."""
    rng = random.Random(seed)
    tasks: list[dict] = []
    order = 0
    for level, pool, n in LADDER:
        for prompt in rng.sample(pool, n):
            tasks.append({"kind": "reading", "item_level": level, "prompt_text": prompt, "order_index": order})
            order += 1
    for word in rng.sample(ASER_WORDS, 6):
        tasks.append({"kind": "writing", "item_level": "word_dictation", "prompt_text": word, "order_index": order})
        order += 1
    tasks.append({"kind": "writing", "item_level": "sentence_dictation",
                  "prompt_text": rng.choice(ASER_SENTENCES), "order_index": order})
    order += 1
    passage = " ".join(rng.sample(ASER_SENTENCES, 3))
    tasks.append({"kind": "speech", "item_level": "passage", "prompt_text": passage, "order_index": order})
    return tasks
