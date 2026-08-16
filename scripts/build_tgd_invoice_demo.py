from pathlib import Path
import subprocess

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "videos" / "tgd-invoice-demo.mp4"
MUSIC = Path(r"C:\Users\mrfox\Music\petrushkasound-upbeat-amp-rock-background-music-461924.mp3")
WIDTH, HEIGHT, FPS = 1280, 720, 24
BG, PANEL, PANEL_2 = "#05080d", "#0c1420", "#111c2a"
ORANGE, WHITE, MUTED, GREEN = "#ff6b00", "#f7f9fc", "#9fb0c4", "#28d17c"


def font(size, bold=False):
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")), size)


def rounded(draw, box, radius=18, fill=PANEL, outline="#26364a", width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, size, fill=WHITE, bold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=fill, anchor=anchor)


def shell(title, step):
    im = Image.new("RGB", (WIDTH, HEIGHT), BG)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, WIDTH, 74), fill="#071321")
    d.rectangle((0, 72, WIDTH, 76), fill=ORANGE)
    text(d, (38, 24), "TGD", 30, ORANGE, True)
    text(d, (120, 28), "TRADES", 20, WHITE, True)
    text(d, (WIDTH - 38, 30), "INVOICE DEMO", 14, MUTED, True, "ra")
    text(d, (48, 112), step.upper(), 14, ORANGE, True)
    text(d, (48, 142), title, 40, WHITE, True)
    return im, d


def button(d, box, label, active=True):
    rounded(d, box, 14, ORANGE if active else PANEL_2, ORANGE if active else "#314255", 2)
    text(d, ((box[0] + box[2]) // 2, (box[1] + box[3]) // 2), label, 18, "#070b10" if active else WHITE, True, "mm")


def title_scene():
    im, d = shell("Your invoice practically writes itself.", "TGD Trades")
    rounded(d, (48, 220, 1232, 625), 28, "#080f18", "#4c2b14", 2)
    text(d, (92, 278), "THE JOB IS DONE.", 17, ORANGE, True)
    text(d, (92, 322), "Turn completed work into a", 48, WHITE, True)
    text(d, (92, 382), "professional invoice in a few taps.", 48, WHITE, True)
    text(d, (92, 476), "Customer, labour, materials and VAT are already waiting.", 24, MUTED)
    button(d, (92, 532, 340, 590), "SEE HOW IT WORKS")
    text(d, (1190, 676), "DEMO DATA", 12, MUTED, True, "ra")
    return im


def completed_job():
    im, d = shell("The completed job already holds the details.", "Step 1 · Open the job")
    rounded(d, (48, 216, 1232, 644), 24)
    text(d, (82, 248), "JOB-1042", 14, ORANGE, True)
    text(d, (82, 280), "Kitchen repair · Demo Customer", 30, WHITE, True)
    text(d, (82, 330), "Completed today", 18, GREEN, True)
    for i, (k, v) in enumerate([
        ("Labour", "£600.00"), ("Materials", "£144.00"), ("Waste removal", "£15.00"), ("VAT", "20%")
    ]):
        y = 392 + i * 48
        text(d, (92, y), k, 19, MUTED)
        text(d, (600, y), v, 19, WHITE, True, "ra")
    rounded(d, (720, 270, 1182, 565), 20, PANEL_2)
    text(d, (756, 306), "READY FOR THE NEXT STEP", 14, ORANGE, True)
    text(d, (756, 354), "Job notes", 18, WHITE, True)
    text(d, (756, 392), "Materials used", 18, WHITE, True)
    text(d, (756, 430), "Customer details", 18, WHITE, True)
    text(d, (756, 468), "Work total", 18, WHITE, True)
    button(d, (756, 506, 1144, 556), "CREATE INVOICE")
    return im


def invoice_form():
    im, d = shell("No typing everything again.", "Step 2 · Review the invoice")
    rounded(d, (48, 210, 1232, 650), 24)
    text(d, (82, 246), "INVOICE DETAILS", 15, ORANGE, True)
    text(d, (82, 282), "Demo Customer", 27, WHITE, True)
    text(d, (82, 320), "JOB-1042 · Kitchen repair", 17, MUTED)
    headers = ["DESCRIPTION", "QTY", "UNIT", "TOTAL"]
    xs = [82, 720, 870, 1125]
    for x, h in zip(xs, headers): text(d, (x, 378), h, 13, MUTED, True, "ra" if x > 82 else None)
    rows = [("Labour", "1", "£600.00", "£600.00"), ("Materials & parts", "1", "£144.00", "£144.00"), ("Waste removal", "1", "£15.00", "£15.00")]
    for i, row in enumerate(rows):
        y = 422 + i * 48
        d.line((82, y + 31, 1150, y + 31), fill="#233246", width=1)
        text(d, (82, y), row[0], 18)
        for x, value in zip(xs[1:], row[1:]): text(d, (x, y), value, 18, WHITE, x == 1125, "ra")
    text(d, (940, 582), "TOTAL DUE", 14, MUTED, True, "ra")
    text(d, (1150, 574), "£910.80", 32, ORANGE, True, "ra")
    button(d, (82, 566, 360, 622), "GENERATE PDF")
    return im


def pdf_reveal():
    im, d = shell("A clean invoice—ready to send.", "Step 3 · Generate the PDF")
    d.rounded_rectangle((338, 192, 942, 680), radius=16, fill="#ffffff", outline=ORANGE, width=3)
    text(d, (374, 224), "OAK & STONE", 21, "#111827", True)
    text(d, (900, 224), "INVOICE", 18, ORANGE, True, "ra")
    text(d, (374, 266), "Bill to: Demo Customer", 14, "#58677a")
    text(d, (900, 266), "INV-1042", 14, "#58677a", True, "ra")
    d.rectangle((374, 316, 906, 352), fill="#101827")
    for x, h in [(390, "Description"), (700, "Qty"), (790, "Unit"), (888, "Total")]: text(d, (x, 334), h, 12, "#ffffff", True, "rm" if x > 390 else "lm")
    rows = [("Labour", "1", "£600.00", "£600.00"), ("Materials & parts", "1", "£144.00", "£144.00"), ("Waste removal", "1", "£15.00", "£15.00")]
    for i, row in enumerate(rows):
        y = 382 + i * 45
        if i % 2 == 0: d.rectangle((374, y - 10, 906, y + 25), fill="#f3f6fa")
        text(d, (390, y), row[0], 13, "#182235")
        text(d, (700, y), row[1], 13, "#182235", False, "ra")
        text(d, (790, y), row[2], 13, "#182235", False, "ra")
        text(d, (888, y), row[3], 13, "#182235", True, "ra")
    d.rounded_rectangle((650, 535, 906, 612), radius=12, fill="#fff6ed", outline="#ffb36f", width=2)
    text(d, (674, 558), "TOTAL DUE", 13, ORANGE, True)
    text(d, (882, 582), "£910.80", 24, ORANGE, True, "ra")
    text(d, (374, 640), "Thank you for your business.", 11, "#7a899a")
    return im


def portal_scene():
    im, d = shell("The customer sees it in their portal.", "Step 4 · Send and share")
    rounded(d, (190, 205, 1090, 650), 28, "#09111c", ORANGE, 2)
    text(d, (232, 242), "CUSTOMER PORTAL", 14, ORANGE, True)
    text(d, (232, 280), "Hello, Demo Customer", 30, WHITE, True)
    rounded(d, (232, 342, 1048, 505), 18, PANEL_2)
    text(d, (268, 374), "INVOICE INV-1042", 14, MUTED, True)
    text(d, (268, 412), "Kitchen repair", 24, WHITE, True)
    text(d, (268, 458), "£910.80 outstanding", 22, ORANGE, True)
    button(d, (754, 386, 1008, 452), "VIEW INVOICE", False)
    button(d, (754, 466, 1008, 532), "MARK AS PAID")
    text(d, (232, 575), "Messages · Paperwork · Sign-offs · Payment status", 18, MUTED)
    return im


def paid_scene():
    im, d = shell("Everyone knows where the job stands.", "Step 5 · Payment updated")
    rounded(d, (48, 220, 1232, 625), 24)
    d.ellipse((92, 275, 188, 371), fill="#123c2c", outline=GREEN, width=3)
    text(d, (140, 324), "✓", 50, GREEN, True, "mm")
    text(d, (230, 278), "INVOICE PAID", 16, GREEN, True)
    text(d, (230, 316), "£910.80 received", 38, WHITE, True)
    text(d, (230, 372), "INV-1042 · Demo Customer", 19, MUTED)
    rounded(d, (740, 270, 1175, 550), 20, PANEL_2)
    text(d, (778, 304), "DASHBOARD UPDATED", 14, ORANGE, True)
    for i, (k, v) in enumerate([("Outstanding", "£0.00"), ("Paid today", "£910.80"), ("Job status", "Complete")]):
        y = 360 + i * 60
        text(d, (778, y), k, 17, MUTED)
        text(d, (1134, y), v, 18, GREEN if i else WHITE, True, "ra")
    text(d, (92, 545), "From completed job to paid invoice—with a few taps.", 22, WHITE, True)
    return im


def end_scene():
    im, d = shell("Quote once. Keep the whole business moving.", "TGD Trades")
    text(d, (WIDTH // 2, 258), "THE JOB IS DONE.", 18, ORANGE, True, "mm")
    text(d, (WIDTH // 2, 324), "GET THE INVOICE SENT.", 48, WHITE, True, "mm")
    text(d, (WIDTH // 2, 386), "GET PAID.", 48, WHITE, True, "mm")
    text(d, (WIDTH // 2, 468), "TGD Trades", 28, ORANGE, True, "mm")
    text(d, (WIDTH // 2, 512), "Your trade business. One connected system.", 20, MUTED, False, "mm")
    button(d, (490, 566, 790, 626), "TRADES-GO-DIGITAL.CO.UK")
    return im


SCENES = [(title_scene, 6), (completed_job, 8), (invoice_form, 8), (pdf_reveal, 10), (portal_scene, 8), (paid_scene, 8), (end_scene, 7)]


def main():
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    silent = OUT.with_name("tgd-invoice-demo-silent.mp4")
    command = [ff, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", str(silent)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    for maker, seconds in SCENES:
        base = maker()
        for i in range(seconds * FPS):
            p = i / max(1, seconds * FPS - 1)
            scale = 1.0 + 0.012 * p
            w, h = round(WIDTH * scale), round(HEIGHT * scale)
            frame = base.resize((w, h), Image.Resampling.LANCZOS).crop(((w-WIDTH)//2, (h-HEIGHT)//2, (w+WIDTH)//2, (h+HEIGHT)//2))
            fade = min(1, p / .10, (1-p) / .10)
            if fade < 1: frame = Image.blend(Image.new("RGB", frame.size, BG), frame, max(0, fade))
            process.stdin.write(frame.tobytes())
    process.stdin.close()
    if process.wait(): raise SystemExit("Video render failed")
    if not MUSIC.exists(): raise SystemExit(f"Missing music: {MUSIC}")
    mux = [ff, "-y", "-i", str(silent), "-stream_loop", "-1", "-i", str(MUSIC), "-filter:a", "volume=0.34,afade=t=in:st=0:d=1.2,afade=t=out:st=53:d=2", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(OUT)]
    subprocess.run(mux, check=True)
    silent.unlink(missing_ok=True)
    print(OUT)


if __name__ == "__main__":
    main()
