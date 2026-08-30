from pathlib import Path
import subprocess

import os
import shutil
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "public" / "images"
OUT_DIR = ROOT / "public" / "videos"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "tgd-trades-demo.mp4"

WIDTH, HEIGHT, FPS = 1280, 720, 24
SLIDE_SECONDS = 8
SOURCE_CACHE = {}

SLIDES = [
    ("tgd-orange-trade-poster.webp", "TGD TRADES", "Your trade business. One connected system."),
    ("tgd-dashboard.png", "KNOW WHAT NEEDS ATTENTION", "Jobs, takings and outstanding work in one clear view."),
    ("tgd-quote-page.png", "QUOTE FROM YOUR MATERIAL LIST", "Use the rolling list connected to your saved materials and prices."),
    ("tgd-suppliers-page.png", "KEEP MATERIAL PRICES CURRENT", "Supplier invoices and receipts help AI update the prices you quote from."),
    ("tgd-job-folder.png", "KEEP THE JOB CONNECTED", "Customer details, notes, photos and paperwork stay together."),
    ("tgd-work-calendar.png", "BOOK THE WORK", "Accepted dates move into your working calendar."),
    ("tgd-office-mailroom-safe.png", "AI OFFICE MAILROOM", "Supplier emails arrive with PDFs. AI scans every invoice and receipt."),
    ("tgd-business-office.png", "FILED IN THE RIGHT PLACE", "The Mailroom sends each document into the correct Business Office folder."),
    ("tgd-accountant-pdf.png", "ONE-TAP ACCOUNTANT REPORTS", "Send the monthly report yourself or schedule it to send automatically."),
    ("tgd-vehicles-logs.png", "BUILT FOR REAL WORKING DAYS", "Vehicles, mileage and business records wherever you work."),
    ("tgd-orange-trade-poster.webp", "LESS THAN £1 A DAY", "For your first 3 months. Start TGD Trades today."),
]


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size=size)


def cover(source, zoom=1.0, pan=0.0):
    key = str(source)
    if key not in SOURCE_CACHE:
        SOURCE_CACHE[key] = Image.open(source).convert("RGB")
    image = SOURCE_CACHE[key]
    scale = max(WIDTH / image.width, HEIGHT / image.height) * zoom
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    max_x = max(0, resized.width - WIDTH)
    max_y = max(0, resized.height - HEIGHT)
    x = int(max_x * (0.5 + pan * 0.18))
    y = int(max_y * 0.5)
    return resized.crop((x, y, x + WIDTH, y + HEIGHT))


def wrap_text(draw, text, text_font, max_width):
    words, lines, current = text.split(), [], ""
    for word in words:
        attempt = f"{current} {word}".strip()
        if draw.textbbox((0, 0), attempt, font=text_font)[2] <= max_width:
            current = attempt
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def frame_for(slide_index, progress):
    filename, heading, caption = SLIDES[slide_index]
    base = cover(IMAGES / filename, zoom=1.02 + progress * 0.035, pan=progress - 0.5)
    base = ImageEnhance.Contrast(base).enhance(1.04)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 500, 9, 646), fill=(255, 107, 0, 255))
    draw.rectangle((62, 486, 160, 491), fill=(255, 107, 0, 255))

    heading_font = font(48, True)
    caption_font = font(26, False)
    small_font = font(18, True)
    for offset in ((3, 3), (0, 4), (4, 0)):
        draw.text((62 + offset[0], 505 + offset[1]), heading, font=heading_font, fill=(0, 0, 0, 180))
    draw.text((62, 505), heading, font=heading_font, fill=(255, 255, 255, 255))
    for i, line in enumerate(wrap_text(draw, caption, caption_font, 1050)):
        for offset in ((2, 2), (0, 3), (3, 0)):
            draw.text((64 + offset[0], 574 + i * 36 + offset[1]), line, font=caption_font, fill=(0, 0, 0, 170))
        draw.text((64, 574 + i * 36), line, font=caption_font, fill=(232, 238, 246, 255))
    draw.text((1030, 668), "TRADES GO DIGITAL", font=small_font, fill=(255, 122, 0, 255))

    fade = min(1.0, progress / 0.16, (1.0 - progress) / 0.16)
    combined = Image.alpha_composite(base.convert("RGBA"), overlay)
    if fade < 1:
        black = Image.new("RGBA", combined.size, (1, 3, 6, 255))
        combined = Image.blend(black, combined, max(0.0, fade))
    return combined.convert("RGB")


def main():
    ffmpeg = os.environ.get("FFMPEG_BINARY") or shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("Install FFmpeg or set FFMPEG_BINARY to its executable path.")
    command = [
        ffmpeg, "-y", "-f", "rawvideo", "-vcodec", "rawvideo",
        "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS),
        "-i", "-", "-an", "-vcodec", "libx264", "-preset", "medium",
        "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        count = SLIDE_SECONDS * (FPS // 2)
        for slide_index in range(len(SLIDES)):
            for frame_index in range(count):
                progress = frame_index / max(1, count - 1)
                frame_data = frame_for(slide_index, progress).tobytes()
                process.stdin.write(frame_data)
                process.stdin.write(frame_data)
    finally:
        if process.stdin:
            process.stdin.close()
        result = process.wait()
    if result != 0:
        raise SystemExit(result)
    print(OUT)


if __name__ == "__main__":
    main()
