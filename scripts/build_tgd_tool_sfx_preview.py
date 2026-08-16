from pathlib import Path
import subprocess
import wave

import imageio_ffmpeg
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "public" / "videos" / "tgd-trades-demo-music.mp4"
OUT_DIR = ROOT / "preview"
SFX_DIR = OUT_DIR / "tool-sounds"
OUTPUT = OUT_DIR / "tgd-trades-demo-tool-sounds-preview.mp4"
RATE = 44_100


def save_wav(path: Path, samples: np.ndarray) -> None:
    peak = max(1.0, float(np.max(np.abs(samples))))
    pcm = np.int16(np.clip(samples / peak, -1, 1) * 32767)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm.tobytes())


def hammer() -> np.ndarray:
    rng = np.random.default_rng(37)
    duration = 0.42
    t = np.arange(int(RATE * duration)) / RATE
    attack = np.minimum(1.0, t / 0.0015)
    body = (
        0.85 * np.sin(2 * np.pi * 118 * t)
        + 0.48 * np.sin(2 * np.pi * 337 * t)
        + 0.24 * np.sin(2 * np.pi * 811 * t)
    ) * np.exp(-t * 15)
    crack = rng.normal(0, 1, len(t)) * np.exp(-t * 52)
    ring = 0.24 * np.sin(2 * np.pi * 1_730 * t) * np.exp(-t * 10)
    return attack * (body + 0.52 * crack + ring)


def drill() -> np.ndarray:
    rng = np.random.default_rng(73)
    duration = 1.35
    t = np.arange(int(RATE * duration)) / RATE
    spin = 112 + 38 * np.minimum(1, t / 0.18)
    phase = 2 * np.pi * np.cumsum(spin) / RATE
    motor = np.sin(phase) + 0.52 * np.sin(3 * phase) + 0.24 * np.sin(7 * phase)
    chatter = np.sign(np.sin(2 * np.pi * 31 * t)) * rng.normal(0, 0.22, len(t))
    envelope = np.minimum(1, t / 0.06) * np.minimum(1, (duration - t) / 0.16)
    return envelope * (0.64 * motor + chatter)


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    SFX_DIR.mkdir(exist_ok=True)
    hammer_path = SFX_DIR / "original-hammer-hit.wav"
    drill_path = SFX_DIR / "original-short-drill.wav"
    save_wav(hammer_path, hammer())
    save_wav(drill_path, drill())

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    filters = (
        "[0:a]volume='if(between(t,0.55,2.1)+between(t,4.0,5.5)+between(t,31.8,33.5)+between(t,79.8,80.8),0.48,1.0)':eval=frame[bed];"
        "[1:a]volume=0.88,adelay=650|650[h1];"
        "[1:a]volume=0.78,adelay=1120|1120[h2];"
        "[1:a]volume=0.68,adelay=1590|1590[h3];"
        "[2:a]volume=0.48,adelay=4100|4100[d0];"
        "[2:a]volume=0.36,adelay=32000|32000[d1];"
        "[1:a]volume=0.62,adelay=80000|80000[h4];"
        "[bed][h1][h2][h3][d0][d1][h4]amix=inputs=7:duration=first:normalize=0,"
        "alimiter=limit=0.92[outa]"
    )
    command = [
        ffmpeg, "-y", "-i", str(VIDEO), "-i", str(hammer_path), "-i", str(drill_path),
        "-filter_complex", filters,
        "-map", "0:v:0", "-map", "[outa]", "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(OUTPUT),
    ]
    subprocess.run(command, check=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
