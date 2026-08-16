from pathlib import Path
import subprocess

import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "public" / "videos" / "tgd-trades-demo.mp4"
MUSIC = Path(r"C:\Users\mrfox\Music\petrushkasound-upbeat-amp-rock-background-music-461924.mp3")
OUTPUT = ROOT / "public" / "videos" / "tgd-trades-demo-music.mp4"

if not MUSIC.exists():
    raise SystemExit(f"Music file not found: {MUSIC}")

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
command = [
    ffmpeg, "-y",
    "-i", str(VIDEO),
    "-stream_loop", "-1", "-i", str(MUSIC),
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy",
    "-af", "volume=0.28,afade=t=in:st=0:d=2,afade=t=out:st=84:d=4",
    "-c:a", "aac", "-b:a", "160k",
    "-t", "88", "-movflags", "+faststart",
    str(OUTPUT),
]
subprocess.run(command, check=True)
print(OUTPUT)
