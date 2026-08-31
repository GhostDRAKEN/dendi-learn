"""Generate temporary, original UI sounds for Dendi-Learn.

The generator intentionally uses only Python's standard library. Output is
deterministic mono PCM WAV at 44.1 kHz / 16 bit and can be regenerated with:

    python scripts/generate-ui-sounds.py
"""

from __future__ import annotations

import math
import struct
import wave
from dataclasses import dataclass
from pathlib import Path


SAMPLE_RATE = 44_100
SAMPLE_WIDTH = 2
MAX_PCM_16 = 32_767
PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "public" / "sounds"


@dataclass(frozen=True)
class Note:
    frequency: float
    start: float
    duration: float
    gain: float = 1.0
    attack: float = 0.012
    release: float = 0.075


@dataclass(frozen=True)
class Sound:
    filename: str
    duration: float
    master_gain: float
    notes: tuple[Note, ...]


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def envelope(local_time: float, note: Note) -> float:
    if local_time < 0.0 or local_time >= note.duration:
        return 0.0

    attack = smoothstep(local_time / max(note.attack, 1e-6))
    release = smoothstep((note.duration - local_time) / max(note.release, 1e-6))
    return attack * release


def warm_tone(frequency: float, local_time: float) -> float:
    """A soft additive timbre with restrained upper harmonics."""

    phase = 2.0 * math.pi * frequency * local_time
    return (
        math.sin(phase)
        + 0.16 * math.sin(2.0 * phase + 0.18)
        + 0.045 * math.sin(3.0 * phase)
    ) / 1.205


def render(sound: Sound) -> list[float]:
    frame_count = round(sound.duration * SAMPLE_RATE)
    samples: list[float] = []

    for frame in range(frame_count):
        time = frame / SAMPLE_RATE
        mixed = 0.0
        for note in sound.notes:
            local_time = time - note.start
            note_envelope = envelope(local_time, note)
            if note_envelope:
                mixed += note.gain * note_envelope * warm_tone(note.frequency, local_time)

        samples.append(sound.master_gain * mixed)

    peak = max((abs(sample) for sample in samples), default=0.0)
    if peak > 0.82:
        safety_scale = 0.82 / peak
        samples = [sample * safety_scale for sample in samples]

    return samples


def write_wav(path: Path, samples: list[float]) -> tuple[float, float]:
    peak = max((abs(sample) for sample in samples), default=0.0)
    rms = math.sqrt(sum(sample * sample for sample in samples) / max(1, len(samples)))
    frames = b"".join(
        struct.pack("<h", round(max(-1.0, min(1.0, sample)) * MAX_PCM_16))
        for sample in samples
    )

    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(SAMPLE_WIDTH)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(frames)

    return peak, rms


SOUNDS = (
    Sound(
        filename="welcome.wav",
        duration=0.92,
        master_gain=0.20,
        notes=(
            Note(293.66, 0.00, 0.40, gain=0.78, release=0.11),
            Note(369.99, 0.20, 0.42, gain=0.72, release=0.12),
            Note(440.00, 0.43, 0.48, gain=0.70, release=0.16),
        ),
    ),
    Sound(
        filename="correct.wav",
        duration=0.25,
        master_gain=0.20,
        notes=(
            Note(783.99, 0.00, 0.13, gain=0.72, attack=0.006, release=0.045),
            Note(987.77, 0.085, 0.16, gain=0.66, attack=0.006, release=0.065),
        ),
    ),
    Sound(
        filename="incorrect.wav",
        duration=0.33,
        master_gain=0.16,
        notes=(
            Note(329.63, 0.00, 0.19, gain=0.66, attack=0.012, release=0.075),
            Note(293.66, 0.12, 0.20, gain=0.60, attack=0.014, release=0.095),
        ),
    ),
    Sound(
        filename="phase-complete.wav",
        duration=0.58,
        master_gain=0.23,
        notes=(
            Note(293.66, 0.00, 0.24, gain=0.70, release=0.085),
            Note(440.00, 0.15, 0.27, gain=0.67, release=0.10),
            Note(587.33, 0.31, 0.26, gain=0.64, release=0.12),
        ),
    ),
    Sound(
        filename="lesson-complete.wav",
        duration=1.16,
        master_gain=0.25,
        notes=(
            Note(293.66, 0.00, 0.40, gain=0.72, release=0.12),
            Note(369.99, 0.18, 0.42, gain=0.70, release=0.13),
            Note(440.00, 0.37, 0.45, gain=0.68, release=0.15),
            Note(587.33, 0.56, 0.59, gain=0.72, release=0.22),
        ),
    ),
)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    generated: list[tuple[Path, float, float, float]] = []

    for sound in SOUNDS:
        output_path = OUTPUT_DIR / sound.filename
        samples = render(sound)
        peak, rms = write_wav(output_path, samples)
        generated.append((output_path, sound.duration, peak, rms))

    print("Generated:")
    for path, duration, peak, rms in generated:
        relative_path = path.relative_to(PROJECT_ROOT).as_posix()
        print(f"- {relative_path} ({duration:.2f}s, peak={peak:.3f}, rms={rms:.3f})")


if __name__ == "__main__":
    main()
