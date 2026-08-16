from __future__ import annotations

import math
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "videos" / "tad-the-business-demo.mp4"
MUSIC = Path(r"C:\Users\mrfox\Music\lightbeatsmusic-joyful-rhythm-walk-funk-513936.mp3")

SLIDES = [
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-2081bd3b-b2e8-4085-8575-6304815cb1bc.png"),
        "title": "TAD The Business",
        "body": "One system for your team, jobs, safety, data, plant and profit.",
        "duration": 4.0,
        "logo": True,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-0935f8ea-eb4d-4121-a189-902fd3e4f516.png"),
        "title": "Dashboard",
        "body": "A live view of jobs, income, outstanding money, reminders and recent work.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-9907ef44-4d35-4646-b846-963a53001c41.png"),
        "title": "Business Office",
        "body": "Every document has a place: jobs, certificates, insurance, staff records, services and finance.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-6c83129e-c79e-4c11-945b-278633027f12.png"),
        "title": "Jobs List",
        "body": "Track active jobs, totals and status, then open the full job record when needed.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-a12c19f0-aba2-4b04-a126-60a3483c1c08.png"),
        "title": "Job Page",
        "body": "The job record brings together value, VAT, profit, team allocation and the complete job pack.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-768cc145-3983-4005-a442-d98a6d70329d.png"),
        "title": "Job Planning",
        "body": "Plan each work day with the right staff, vehicles, plant and power tools.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-d41aff74-43fc-42d2-af08-f2d9e795a6c5.png"),
        "title": "RAMS And COSHH",
        "body": "Risk assessments, method statements, COSHH, working at height and PPE stay inside the job pack.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-632ac3d7-cd56-470f-bfa6-e89a4bdcc9ad.png"),
        "title": "Permits To Work",
        "body": "Controlled work permits keep digging, hot works and specialist documents attached to the right job.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-adeb71d5-ff4c-4e60-b727-04703d08d030.png"),
        "title": "Daily Records",
        "body": "Record daily progress, site notes, extra materials, delays and before-and-after photos.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-1d6dfbe0-73ff-4da1-ada5-1a2f3820ce40.png"),
        "title": "Site Register",
        "body": "Log supervisors, managers and client visitors signing in and out of site.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-62d08300-b1b5-496f-a1e8-68cc905e59e7.png"),
        "title": "Waste And Deliveries",
        "body": "Upload delivery tickets, waste notes, grab-lorry receipts and supplier delivery documents.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-eb50e3c5-b3fb-4591-99a5-76ded860f381.png"),
        "title": "Build Quotes",
        "body": "Build the quote and preview the customer PDF as the information is entered.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-c1fffe4c-588b-452a-b6c0-ef716f860439.png"),
        "title": "Vehicles And Plant On Quotes",
        "body": "Add staff, vehicles, plant and tools so the job plan starts from the quote.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-e56099bf-4ba8-4bfc-b77b-223ae2422491.png"),
        "title": "Materials And PDF Preview",
        "body": "Choose materials from your list and see the quote PDF update on the same screen.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-a3c23d0c-8477-4de5-b0c7-ff0ab27b11ce.png"),
        "title": "Staff And Client Portals",
        "body": "Create controlled portals for staff access, client updates and shared job information.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-fc88c91b-a654-41b8-a8d6-8259d5fe17be.png"),
        "title": "Work Calendar",
        "body": "See booked work across the month and keep planned jobs visible for the team.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-7f3bbadc-af4b-4481-882c-f08b12091a4d.png"),
        "title": "Notebook",
        "body": "Write emails, record voice notes and open the Office Mailroom from one simple place.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-fc2e85e3-48ab-4279-bb48-12388aeac442.png"),
        "title": "Office Mailroom",
        "body": "Drop PDFs or images into the mailroom, review incoming paperwork and file it safely.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-5b19e33b-cf42-45da-a086-119df674bf85.png"),
        "title": "Settings And Business Identity",
        "body": "Set business details once so quotes, invoices, payslips and reports carry the right branding.",
        "duration": 4.55,
    },
    {
        "path": Path(r"C:\Users\mrfox\AppData\Local\Temp\codex-clipboard-2081bd3b-b2e8-4085-8575-6304815cb1bc.png"),
        "title": "TAD The Business",
        "body": "Trades are digital. One business, every part connected.",
        "duration": 4.0,
        "logo": True,
    },
]


W, H = 1920, 1080
FPS = 24
ORANGE = (255, 107, 0)
INK = (4, 6, 10)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


TITLE = font(58, True)
BODY = font(30)
SMALL = font(22, True)


def cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    iw, ih = img.size
    sw, sh = size
    scale = max(sw / iw, sh / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    return img.crop(((nw - sw) // 2, (nh - sh) // 2, (nw + sw) // 2, (nh + sh) // 2))


def contain(img: Image.Image, box: tuple[int, int]) -> Image.Image:
    iw, ih = img.size
    bw, bh = box
    scale = min(bw / iw, bh / ih)
    return img.resize((int(iw * scale), int(ih * scale)), Image.Resampling.LANCZOS)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        if draw.textbbox((0, 0), test, font=face)[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def caption_panel(frame: Image.Image, title: str, body: str) -> None:
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    panel_h = 190
    od.rectangle((0, H - panel_h, W, H), fill=(3, 5, 8, 228))
    od.rectangle((0, H - panel_h, W, H - panel_h + 6), fill=ORANGE + (255,))
    od.text((74, H - panel_h + 34), title, font=TITLE, fill=(255, 255, 255, 255))
    lines = wrap(od, body, BODY, W - 148)
    y = H - panel_h + 104
    for line in lines[:2]:
        od.text((76, y), line, font=BODY, fill=(220, 228, 238, 255))
        y += 40
    frame.alpha_composite(overlay)


def make_frame(slide: dict, progress: float) -> Image.Image:
    src = Image.open(slide["path"]).convert("RGB")
    return src.resize((W, H), Image.Resampling.LANCZOS).convert("RGBA")


def main() -> None:
    missing = [str(s["path"]) for s in SLIDES if not s["path"].exists()]
    if missing:
        raise FileNotFoundError("\n".join(missing))
    if not MUSIC.exists():
        raise FileNotFoundError(str(MUSIC))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    temp_root = ROOT / "tmp" / "video-render"
    temp_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=temp_root) as tmp:
        tmp_path = Path(tmp)
        silent = tmp_path / "silent.mp4"
        concat = tmp_path / "slides.txt"
        slide_paths: list[Path] = []

        for index, slide in enumerate(SLIDES):
            slide_path = tmp_path / f"slide-{index:02d}.png"
            make_frame(slide, 0.5).convert("RGB").save(slide_path, quality=95)
            slide_paths.append(slide_path)

        with concat.open("w", encoding="utf-8") as f:
            for slide, slide_path in zip(SLIDES, slide_paths):
                safe_path = slide_path.as_posix().replace("'", "'\\''")
                f.write(f"file '{safe_path}'\n")
                f.write(f"duration {float(slide['duration']):.2f}\n")
            safe_path = slide_paths[-1].as_posix().replace("'", "'\\''")
            f.write(f"file '{safe_path}'\n")

        cmd = [
            ffmpeg,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat),
            "-vf",
            f"fps={FPS},format=yuv420p",
            "-vcodec",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            str(silent),
        ]
        subprocess.run(cmd, check=True)

        duration = sum(float(s["duration"]) for s in SLIDES)
        mux_cmd = [
            ffmpeg,
            "-y",
            "-i",
            str(silent),
            "-stream_loop",
            "-1",
            "-i",
            str(MUSIC),
            "-t",
            f"{duration:.2f}",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-af",
            "afade=t=in:st=0:d=1.2,afade=t=out:st={:.2f}:d=1.8".format(max(0, duration - 1.8)),
            "-shortest",
            str(OUT),
        ]
        subprocess.run(mux_cmd, check=True)

    print(OUT)


if __name__ == "__main__":
    main()
