from pathlib import Path
import subprocess
import wave

import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[1]
VOICE_DIR = ROOT / "tmp" / "tgd-voiceover"
AUDIO = VOICE_DIR / "narration.wav"
VIDEO = ROOT / "public" / "videos" / "tgd-trades-demo.mp4"
VOICED = ROOT / "public" / "videos" / "tgd-trades-demo-voiced.mp4"
SLOT_SECONDS = 8


def build_narration():
    files = sorted(VOICE_DIR.glob("line-*.wav"))
    if not files:
        raise SystemExit("No narration clips found")

    with wave.open(str(files[0]), "rb") as first:
        params = first.getparams()
        frame_rate = first.getframerate()
        channels = first.getnchannels()
        sample_width = first.getsampwidth()

    slot_bytes = SLOT_SECONDS * frame_rate * channels * sample_width
    silence = b"\x00" * slot_bytes

    with wave.open(str(AUDIO), "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(sample_width)
        output.setframerate(frame_rate)
        for source in files:
            with wave.open(str(source), "rb") as clip:
                data = clip.readframes(clip.getnframes())
            # Start each line after a short breath and keep it within its slide.
            lead = b"\x00" * int(0.28 * frame_rate * channels * sample_width)
            slot = (lead + data)[:slot_bytes]
            output.writeframes(slot + silence[len(slot):])


def mux():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg, "-y", "-i", str(VIDEO), "-i", str(AUDIO),
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
        "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart",
        str(VOICED),
    ]
    subprocess.run(command, check=True)


if __name__ == "__main__":
    build_narration()
    mux()
    print(VOICED)
