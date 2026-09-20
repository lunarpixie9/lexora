"""Personalised practice generation.

Two generators produce the same validated structure:
  * DeterministicGenerator - local, always available, built from phonics word
    families and the child's own missed items. Labelled source="deterministic".
  * GeminiGenerator - optional, only if GEMINI_API_KEY is set (Google's free
    tier; no billing required). Output is validated with Pydantic and falls
    back to the deterministic generator on any failure. Labelled source="gemini".

Neither generator ever refers to diagnosis; prompts and templates use
"practice" language only.
"""
from __future__ import annotations

import logging
import random
from typing import Any, Literal

import httpx
from pydantic import BaseModel, Field, ValidationError

from lexora_nlp import analyze_text, normalize_text

from ..config import get_settings
from ..content import ASER_SENTENCES, ASER_WORDS

log = logging.getLogger("lexora.practice")

WORD_FAMILIES = {
    "at": ["cat", "bat", "hat", "mat", "rat", "sat"], "an": ["man", "fan", "can", "pan", "ran", "van"],
    "ig": ["big", "dig", "pig", "wig", "fig"], "og": ["dog", "log", "fog", "hog", "jog"],
    "un": ["sun", "run", "bun", "fun"], "en": ["pen", "hen", "ten", "men", "den"],
    "ox": ["box", "fox"], "ug": ["bug", "hug", "mug", "rug", "jug"], "et": ["wet", "net", "pet", "jet", "get"],
    "ot": ["hot", "pot", "dot", "cot", "not"], "up": ["cup", "pup"], "ed": ["red", "bed", "fed", "led"],
}
# Pairs that differ only by a mirror letter or by letter order - used for orientation practice
ORIENTATION_PAIRS = [("bad", "dad"), ("big", "dig"), ("bog", "dog"), ("bay", "day"), ("bin", "din"),
                     ("was", "saw"), ("on", "no"), ("tap", "pat"), ("top", "pot"), ("net", "ten"), ("pin", "nip")]
NOUNS = {"cat", "dog", "hen", "fox", "cow", "rat", "man", "boy", "bus", "box", "sun", "pen", "cup", "hat", "bag",
         "bat", "mat", "fan", "can", "pan", "van", "pig", "wig", "fig", "log", "hog", "bun", "ten", "den", "bug", "mug",
         "rug", "jug", "net", "pet", "jet", "pot", "cot", "pup", "bed", "lip", "day"}
PLACES = ["box", "bag", "bus", "hat", "tree", "house", "road"]
CHARACTERS = ["cat", "dog", "hen", "fox", "cow", "rat", "man", "boy", "pig", "bug", "pup"]
SKILL_LABELS = {
    "letter_recognition": "Letter recognition",
    "letter_order_and_orientation": "Letter order and orientation",
    "sound_to_spelling": "Matching sounds to spelling",
    "complete_spelling": "Writing every letter",
    "sight_words": "Sight words",
    "reading_fluency": "Reading smoothly",
    "clear_sounds": "Saying every sound",
}
STORY_TEMPLATES = [
    ("The {w1} and the {w2}",
     "A {w1} sat by the {w3}. It was a {w4} day. A {w2} came to play. The {w1} and the {w2} ran in the sun. "
     "Then they sat down to rest. It was a good day.", ["hot", "wet", "big", "new"]),
    ("A day with {w1}",
     "I have a {w1}. My {w1} is {w4}. We go out to see the {w2}. The {w2} is by the {w3}. "
     "We like to play and sing. Then we go home.", ["big", "old", "new", "fat", "red"]),
]


class WordChoiceItem(BaseModel):
    prompt: str
    options: list[str] = Field(min_length=2, max_length=4)
    answer: str


class SpellingItem(BaseModel):
    word: str
    hint: str = ""


class ReadingItem(BaseModel):
    sentence: str


class StoryQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=2, max_length=4)
    answer: str


class ActivityContent(BaseModel):
    kind: Literal["word_practice", "spelling", "reading", "story"]
    title: str = Field(max_length=160)
    instructions: str
    target_skills: list[str]
    word_choice: list[WordChoiceItem] = []
    spelling: list[SpellingItem] = []
    reading: list[ReadingItem] = []
    story_text: str = ""
    questions: list[StoryQuestion] = []


def _distractors(word: str, rng: random.Random, profile: dict) -> list[str]:
    """Wrong spellings shaped by the child's own observed error patterns."""
    cands = set()
    for a, b in ORIENTATION_PAIRS:
        if word == a:
            cands.add(b)
        if word == b:
            cands.add(a)
    swaps = {"b": "d", "d": "b", "p": "q", "q": "p", "m": "w", "w": "m", "n": "u", "u": "n"}
    for i, ch in enumerate(word):
        if ch in swaps:
            cands.add(word[:i] + swaps[ch] + word[i + 1:])
    if len(word) > 2:
        cands.add(word[:-1])  # omission
        cands.add(word[1] + word[0] + word[2:])  # transposition
        vowels = "aeiou"
        for i, ch in enumerate(word):
            if ch in vowels:
                cands.add(word[:i] + rng.choice([v for v in vowels if v != ch]) + word[i + 1:])
                break
    cands.discard(word)
    cands = sorted(cands)
    rng.shuffle(cands)
    return cands[:3]


class DeterministicGenerator:
    source = "deterministic"

    def generate(self, child: dict, profile: dict, seed: int) -> list[ActivityContent]:
        rng = random.Random(seed)
        skills = profile.get("target_skills") or ["reading_fluency"]
        # practice targets: alphabetic content words; one- and two-letter function words are not useful drills
        missed_words = [w for w in profile.get("words_missed", []) if w.isalpha() and len(w) >= 3]
        pool = missed_words[:]
        for fam, words in WORD_FAMILIES.items():
            if any(w.endswith(fam) for w in missed_words):
                pool += words
        pool += rng.sample(ASER_WORDS, 6)
        pool = list(dict.fromkeys(w.lower() for w in pool))[:12]
        acts: list[ActivityContent] = []

        # 1. word choice - pick the correct spelling (targets orientation/spelling patterns)
        items = []
        for w in rng.sample(pool, min(6, len(pool))):
            distractors = _distractors(w, rng, profile)
            if not distractors:  # one-letter words ("a", "i") have no plausible wrong spellings
                continue
            opts = distractors + [w]
            rng.shuffle(opts)
            items.append(WordChoiceItem(prompt=w, options=opts, answer=w))
        if not items:
            for w in rng.sample(ASER_WORDS, 6):
                opts = _distractors(w, rng, profile) + [w]
                rng.shuffle(opts)
                items.append(WordChoiceItem(prompt=w, options=opts, answer=w))
        acts.append(ActivityContent(
            kind="word_practice", title="Spot the right word",
            instructions="Listen to the word, then tap the spelling that is correct.",
            target_skills=[s for s in skills if s in ("letter_order_and_orientation", "sight_words", "letter_recognition")] or skills[:1],
            word_choice=items))

        # 2. spelling dictation with a sound hint
        sp = [SpellingItem(word=w, hint=f"It rhymes with {rng.choice([x for x in WORD_FAMILIES.get(w[1:], [w]) if x != w] or [w])}.")
              for w in rng.sample(pool, min(6, len(pool)))]
        acts.append(ActivityContent(
            kind="spelling", title="Listen and spell",
            instructions="Press play to hear the word, then type it. Take your time.",
            target_skills=[s for s in skills if s in ("sound_to_spelling", "complete_spelling", "sight_words")] or skills[:1],
            spelling=sp))

        # 3. reading sentences using the practice words
        sentences = [s for s in ASER_SENTENCES if any(w in normalize_text(s).split() for w in pool)]
        sentences = rng.sample(sentences, min(3, len(sentences))) if sentences else []
        noun_pool = [w for w in pool if w in NOUNS] or ["cat", "dog", "bag"]
        for w in rng.sample(noun_pool, min(3, len(noun_pool))):
            sentences.append(rng.choice([f"I can see a {w}.", f"The {w} is here.", f"Look at the {w}."]))
        acts.append(ActivityContent(
            kind="reading", title="Read it out loud",
            instructions="Read each sentence aloud. Tap 'I read it' when you finish a line.",
            target_skills=["reading_fluency"] + (["clear_sounds"] if "clear_sounds" in skills else []),
            reading=[ReadingItem(sentence=s) for s in sentences[:6]]))

        # 4. short story + comprehension
        nouns = [w for w in pool if w in CHARACTERS]
        nouns = list(dict.fromkeys(nouns + ["cat", "dog", "hen"]))[:2]
        title_t, body_t, adjectives = rng.choice(STORY_TEMPLATES)
        adj = rng.choice(adjectives)
        w1, w2, w3, w4 = nouns[0], nouns[1], rng.choice(PLACES), adj
        text = body_t.format(w1=w1, w2=w2, w3=w3, w4=w4)
        acts.append(ActivityContent(
            kind="story", title=title_t.format(w1=w1, w2=w2), instructions="Read the story, then answer two questions.",
            target_skills=["reading_fluency", "sight_words"], story_text=text,
            questions=[
                StoryQuestion(question=f"Who came to play with the {w1}?" if "came to play" in text else f"What do I have?",
                              options=[w2, w3, adj] if "came to play" in text else [w1, w2, w3], answer=w2 if "came to play" in text else w1),
                StoryQuestion(question="What kind of day was it?" if "day" in text else f"Where is the {w2}?",
                              options=[adj, "cold", "dark"] if "day" in text else [f"by the {w3}", "in the bag", "on the bus"],
                              answer=adj if "day" in text else f"by the {w3}"),
            ]))
        return acts


class GeminiGenerator:
    source = "gemini"

    def __init__(self, api_key: str, model: str):
        self.api_key, self.model = api_key, model

    def generate(self, child: dict, profile: dict, seed: int) -> list[ActivityContent]:
        schema_hint = ActivityContent.model_json_schema()
        prompt = (
            "You create short English literacy PRACTICE activities for a child in India, age "
            f"{child['age']}, school class {child['class_grade']}. Observed patterns to practise: "
            f"{', '.join(SKILL_LABELS.get(s, s) for s in profile.get('target_skills', []))}. "
            f"Words the child found hard: {', '.join(profile.get('words_missed', [])[:10]) or 'none'}. "
            "Use simple, common words (3-5 letters where possible), warm encouraging tone, Indian everyday context. "
            "Never mention dyslexia, diagnosis, disability or medical terms. Return a JSON array of exactly 4 objects "
            "with kinds word_practice, spelling, reading, story, each matching this JSON schema: "
            + str(schema_hint)
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        body = {"contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7}}
        resp = httpx.post(url, params={"key": self.api_key}, json=body, timeout=30)
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        import json

        data = json.loads(text)
        acts = [ActivityContent.model_validate(a) for a in data]
        banned = ("dyslexi", "diagnos", "disorder", "disabilit")
        for a in acts:
            blob = a.model_dump_json().lower()
            if any(b in blob for b in banned):
                raise ValueError("generated content used clinical language")
        if {a.kind for a in acts} != {"word_practice", "spelling", "reading", "story"}:
            raise ValueError("generated content missing an activity kind")
        return acts


def generate_activities(child: dict, profile: dict, seed: int) -> tuple[list[ActivityContent], str]:
    settings = get_settings()
    if settings.gemini_api_key:
        try:
            gen = GeminiGenerator(settings.gemini_api_key, settings.gemini_model)
            return gen.generate(child, profile, seed), gen.source
        except (httpx.HTTPError, ValidationError, ValueError, KeyError, IndexError) as exc:
            log.warning("Gemini generation failed (%s); using deterministic generator", exc)
    gen = DeterministicGenerator()
    return gen.generate(child, profile, seed), gen.source


def score_attempt(content: dict[str, Any], answers: dict[str, Any]) -> dict:
    """Score a child's answers to an activity. Returns score (0-1), counts and per-item feedback."""
    kind = content["kind"]
    feedback, correct, total = [], 0, 0
    if kind == "word_practice":
        for i, item in enumerate(content["word_choice"]):
            given = str(answers.get(str(i), "")).strip().lower()
            ok = given == item["answer"].lower()
            correct += ok
            total += 1
            feedback.append({"index": i, "expected": item["answer"], "given": given, "correct": ok})
    elif kind == "spelling":
        for i, item in enumerate(content["spelling"]):
            given = str(answers.get(str(i), ""))
            res = analyze_text(item["word"], given)
            ok = res["accuracy"] == 1.0
            correct += ok
            total += 1
            patterns = [p for w in res["word_errors"] for p in w["patterns"]]
            feedback.append({"index": i, "expected": item["word"], "given": given, "correct": ok, "patterns": patterns})
    elif kind == "reading":
        for i, _ in enumerate(content["reading"]):
            ok = bool(answers.get(str(i)))
            correct += ok
            total += 1
            feedback.append({"index": i, "correct": ok})
    elif kind == "story":
        for i, q in enumerate(content["questions"]):
            given = str(answers.get(str(i), "")).strip().lower()
            ok = given == q["answer"].lower()
            correct += ok
            total += 1
            feedback.append({"index": i, "expected": q["answer"], "given": given, "correct": ok})
    return {"score": round(correct / total, 4) if total else 0.0, "correct": correct, "total": total, "feedback": feedback}
