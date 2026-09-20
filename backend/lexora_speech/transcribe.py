"""Local speech recognition with faster-whisper, plus a clearly labelled demo stand-in.

`get_transcriber()` returns a WhisperTranscriber when faster-whisper and its
model weights are usable, otherwise None; the caller decides whether to fall
back to the DemoTranscriber (which never pretends to be real recognition).
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field

log = logging.getLogger("lexora.speech")


@dataclass
class Word:
    text: str
    start: float
    end: float
    probability: float


@dataclass
class Transcript:
    text: str
    words: list[Word] = field(default_factory=list)
    language: str = "en"
    avg_logprob: float | None = None
    engine: str = "unknown"


class WhisperTranscriber:
    def __init__(self, model_size: str = "small", device: str = "cpu"):
        from faster_whisper import WhisperModel

        compute = "int8" if device == "cpu" else "float16"
        self.model_size, self.engine = model_size, f"faster-whisper:{model_size}"
        self._model = WhisperModel(model_size, device=device, compute_type=compute)
        self._lock = threading.Lock()  # one CPU transcription at a time

    def transcribe(self, wav_path: str, expected_text: str | None = None) -> Transcript:
        # The expected prompt is NOT passed as initial_prompt: doing so biases Whisper
        # towards "hearing" the prompt, which would hide the child's actual errors.
        with self._lock:
            segments, info = self._model.transcribe(
                wav_path, language="en", beam_size=3, word_timestamps=True,
                vad_filter=False, condition_on_previous_text=False,
            )
            words, texts, logprobs = [], [], []
            for seg in segments:
                texts.append(seg.text.strip())
                logprobs.append(seg.avg_logprob)
                for w in seg.words or []:
                    words.append(Word(w.word.strip(), float(w.start), float(w.end), float(w.probability)))
        return Transcript(
            text=" ".join(t for t in texts if t),
            words=words,
            language=info.language,
            avg_logprob=sum(logprobs) / len(logprobs) if logprobs else None,
            engine=self.engine,
        )


class DemoTranscriber:
    """Used only when Whisper is unavailable. Returns the expected text with a
    deterministic, obviously synthetic perturbation so the rest of the pipeline
    can be demonstrated. Every result is tagged engine='demo'."""

    engine = "demo"

    def transcribe(self, wav_path: str, expected_text: str | None = None) -> Transcript:
        from lexora_nlp import tokenize

        tokens = tokenize(expected_text or "")
        if len(tokens) >= 4:
            tokens = tokens[:-1]  # "skip" the last word so mismatch features are non-zero
        text = " ".join(tokens)
        t, words = 0.0, []
        for tok in tokens:
            words.append(Word(tok, t, t + 0.4, 0.5))
            t += 0.55
        return Transcript(text=text, words=words, avg_logprob=None, engine=self.engine)


_transcriber: WhisperTranscriber | None = None
_tried = False
_lock = threading.Lock()


def get_transcriber(model_size: str = "small", device: str = "cpu") -> WhisperTranscriber | None:
    """Lazily create the Whisper model once; return None if it cannot be loaded."""
    global _transcriber, _tried
    with _lock:
        if _transcriber is None and not _tried:
            _tried = True
            if not model_size:
                log.info("WHISPER_MODEL empty - Whisper disabled")
                return None
            try:
                _transcriber = WhisperTranscriber(model_size, device)
                log.info("loaded %s", _transcriber.engine)
            except Exception as exc:  # missing weights, no network, unsupported CPU ...
                log.warning("Whisper unavailable (%s); demo transcriber will be used", exc)
        return _transcriber
