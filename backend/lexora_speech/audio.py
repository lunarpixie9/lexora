"""Audio conversion and loading.

Browser recordings arrive as WebM/Opus or OGG, ASER clips are AMR-WB inside a
3GP container named .mp3, NNCES files are 44.1 kHz stereo WAV. Everything is
normalised to 16 kHz mono PCM WAV with ffmpeg (the imageio-ffmpeg wheel bundles
a binary, so no system install is required).
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import numpy as np

TARGET_SR = 16000


def ffmpeg_exe() -> str:
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def to_wav16k(src: str | Path, dst: str | Path | None = None) -> Path:
    src = Path(src)
    dst = Path(dst) if dst else src.with_suffix(".16k.wav")
    subprocess.run(
        [ffmpeg_exe(), "-y", "-hide_banner", "-loglevel", "error", "-i", str(src),
         "-ac", "1", "-ar", str(TARGET_SR), "-sample_fmt", "s16", str(dst)],
        check=True,
    )
    return dst


def load_audio(path: str | Path) -> tuple[np.ndarray, int]:
    """Return float32 mono samples in [-1, 1] and the sample rate."""
    import soundfile as sf

    data, sr = sf.read(str(path), dtype="float32", always_2d=True)
    return data[:, 0], sr


def duration_seconds(path: str | Path) -> float:
    samples, sr = load_audio(path)
    return len(samples) / sr
