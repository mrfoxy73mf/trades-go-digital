from pathlib import Path
import subprocess

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CAP = ROOT / "preview" / "quote-demo-captures"
OUT = ROOT / "public" / "videos" / "tgd-quote-demo.mp4"
MUSIC = Path(r"C:\Users\mrfox\Music\petrushkasound-upbeat-amp-rock-background-music-461924.mp3")
W, H, FPS = 1280, 720, 24
BG, PANEL, ORANGE, WHITE, MUTED = "#05080d", "#0d1622", "#ff6b00", "#f7f9fc", "#9cadc1"


def font(size, bold=False):
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")), size)


def label(draw, xy, value, size, colour=WHITE, bold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=colour, anchor=anchor)


def base(step, heading):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 70), fill="#071321")
    d.rectangle((0, 68, W, 72), fill=ORANGE)
    label(d, (34, 21), "TGD", 29, ORANGE, True)
    label(d, (112, 26), "TRADES", 18, WHITE, True)
    label(d, (W - 34, 28), "REAL QUOTE WORKFLOW", 13, MUTED, True, "ra")
    label(d, (46, 96), step.upper(), 13, ORANGE, True)
    label(d, (46, 119), heading, 31, WHITE, True)
    return im, d


def actual_capture(filename, step, heading, focus="centre"):
    im, d = base(step, heading)
    src = Image.open(CAP / filename).convert("RGB")
    # Remove the app sidebar entirely so account details and sharing services can never appear.
    src = src.crop((240, 0, src.width, src.height))
    src = ImageEnhance.Contrast(src).enhance(1.03)
    target = (46, 168, 1234, 682)
    tw, th = target[2] - target[0], target[3] - target[1]
    scale = min(tw / src.width, th / src.height)
    resized = src.resize((round(src.width * scale), round(src.height * scale)), Image.Resampling.LANCZOS)
    x = target[0] + (tw - resized.width) // 2
    y = target[1] + (th - resized.height) // 2
    d.rounded_rectangle((x - 7, y - 7, x + resized.width + 7, y + resized.height + 7), radius=18, fill=PANEL, outline=ORANGE, width=2)
    im.paste(resized, (x, y))
    label(d, (W - 52, H - 18), "SAFE FICTIONAL DEMO DATA", 11, MUTED, True, "ra")
    return im


def phone_capture(filename, step, heading, crop):
    im, d = base(step, heading)
    src = Image.open(CAP / filename).convert("RGB").crop(crop)
    target = (250, 164, 1030, 690)
    tw, th = target[2] - target[0], target[3] - target[1]
    scale = min(tw / src.width, th / src.height)
    resized = src.resize((round(src.width * scale), round(src.height * scale)), Image.Resampling.LANCZOS)
    x = target[0] + (tw - resized.width) // 2
    y = target[1] + (th - resized.height) // 2
    d.rounded_rectangle((x - 8, y - 8, x + resized.width + 8, y + resized.height + 8), radius=22, fill=PANEL, outline=ORANGE, width=2)
    im.paste(resized, (x, y))
    label(d, (W - 45, H - 18), "CUSTOMER VIEW · PERSONAL DETAILS REMOVED", 11, MUTED, True, "ra")
    return im


def automation_scene():
    im, d = base("Accepted quote · automatic next steps", "The customer taps YES. TGD gets the business moving.")
    boxes = [
        (55, 246, 280, 438, "QUOTE", "Accepted"),
        (365, 246, 590, 438, "JOB", "Created"),
        (675, 246, 900, 438, "PORTAL", "Ready"),
        (985, 246, 1210, 438, "PAPERWORK", "Prepared"),
    ]
    for i, (x1, y1, x2, y2, name, state) in enumerate(boxes):
        d.rounded_rectangle((x1, y1, x2, y2), radius=22, fill=PANEL, outline=ORANGE if i == 0 else "#35516b", width=3)
        label(d, ((x1+x2)//2, y1+55), name, 18, ORANGE, True, "mm")
        label(d, ((x1+x2)//2, y1+111), "✓", 36, "#28d17c", True, "mm")
        label(d, ((x1+x2)//2, y1+157), state, 18, WHITE, True, "mm")
        if i < len(boxes)-1:
            label(d, (x2+42, (y1+y2)//2), "→", 34, ORANGE, True, "mm")
    label(d, (W//2, 512), "The trader sees the accepted job while the customer gets one clear portal", 21, WHITE, True, "mm")
    label(d, (W//2, 552), "for messages, documents, signatures and payment status.", 21, MUTED, False, "mm")
    label(d, (W//2, 624), "A few taps for the customer. The next steps are already organised.", 18, ORANGE, True, "mm")
    return im


def title_scene():
    im, d = base("TGD Trades", "Create a professional quote from the real Quote page.")
    d.rounded_rectangle((54, 210, 1226, 620), radius=28, fill=PANEL, outline="#4f2b12", width=2)
    label(d, (92, 266), "BUILD IT ONCE", 16, ORANGE, True)
    label(d, (92, 312), "Customer. Labour. Materials. VAT.", 46, WHITE, True)
    label(d, (92, 372), "All together on one Quote page.", 46, WHITE, True)
    label(d, (92, 468), "Watch the genuine TGD Trades workflow—not a mock-up.", 23, MUTED)
    d.rounded_rectangle((92, 526, 338, 584), radius=14, fill=ORANGE)
    label(d, (215, 555), "CREATE THE QUOTE", 17, "#090d12", True, "mm")
    return im


def pdf_scene():
    im, d = base("Step 3 · Live preview", "The professional quote is ready before you save.")
    d.rounded_rectangle((338, 168, 942, 692), radius=15, fill="#ffffff", outline=ORANGE, width=3)
    label(d, (374, 201), "OAK & STONE PROPERTY CARE", 18, "#111827", True)
    label(d, (906, 201), "QUOTE", 17, ORANGE, True, "ra")
    label(d, (374, 236), "Demo Customer · 1 Example Street, Demo Town", 12, "#637287")
    label(d, (906, 236), "11 August 2026", 12, "#637287", False, "ra")
    d.rectangle((374, 282, 906, 320), fill="#101827")
    for x, h, a in [(390, "Description", None), (714, "Qty", "ra"), (802, "Price", "ra"), (888, "Amount", "ra")]:
        label(d, (x, 301), h, 12, "#ffffff", True, a)
    rows = [("Labour", "1", "£220.00", "£220.00"), ("Materials", "1", "£86.24", "£86.24")]
    for i, row in enumerate(rows):
        y = 352 + i * 48
        if i % 2 == 0: d.rectangle((374, y - 12, 906, y + 26), fill="#f2f5f9")
        label(d, (390, y), row[0], 14, "#172236")
        for x, value in zip((714, 802, 888), row[1:]): label(d, (x, y), value, 14, "#172236", x == 888, "ra")
    d.rounded_rectangle((634, 474, 906, 590), radius=12, fill="#fff5eb", outline="#ffb06a", width=2)
    label(d, (660, 500), "SUBTOTAL", 12, "#64748b", True)
    label(d, (884, 500), "£306.24", 13, "#172236", False, "ra")
    label(d, (660, 530), "VAT (20%)", 12, "#64748b", True)
    label(d, (884, 530), "£61.25", 13, "#172236", False, "ra")
    label(d, (660, 566), "TOTAL", 14, ORANGE, True)
    label(d, (884, 566), "£367.49", 20, ORANGE, True, "ra")
    label(d, (374, 629), "Quote valid for 30 days. Payment due on completion.", 11, "#7b899b")
    return im


def end_scene():
    im, d = base("Quote complete", "From blank form to professional quote.")
    label(d, (W // 2, 260), "QUOTE THE JOB ONCE.", 47, WHITE, True, "mm")
    label(d, (W // 2, 326), "KEEP THE WHOLE BUSINESS MOVING.", 39, ORANGE, True, "mm")
    label(d, (W // 2, 416), "Customer details, materials, labour, VAT and PDF—done.", 22, MUTED, False, "mm")
    label(d, (W // 2, 494), "TGD Trades", 30, WHITE, True, "mm")
    d.rounded_rectangle((454, 548, 826, 608), radius=14, fill=ORANGE)
    label(d, (640, 578), "TRADES-GO-DIGITAL.CO.UK", 17, "#090d12", True, "mm")
    return im


SCENES = [
	(title_scene, 5),
	(lambda: actual_capture("07-real-quote-top.png", "Step 1 · Customer and labour", "Start with the customer and the work."), 7),
	(lambda: actual_capture("08-real-quote-options.png", "Step 2 · Materials and terms", "Add materials, VAT options and payment terms."), 7),
	(pdf_scene, 7),
	(lambda: actual_capture("09-saved-quote-clean.png", "Step 4 · Save the quote", "The quote is saved as Pending and ready for the customer."), 6),
	(lambda: phone_capture("10-customer-accepts.jpeg", "Step 5 · Customer decision", "The customer reviews the quote, confirms the dates and taps YES.", (0, 170, 1488, 1984)), 6),
	(lambda: phone_capture("11-acceptance-confirmed.jpeg", "Step 6 · Immediate confirmation", "The customer sees that their response reached the trader.", (0, 170, 1488, 1500)), 5),
	(lambda: phone_capture("12-job-created.jpeg", "Step 7 · Trader updated", "The accepted quote is marked and the job is created.", (500, 1320, 1450, 1940)), 6),
	(automation_scene, 7),
	(end_scene, 6),
]


def render():
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    silent = OUT.with_name("tgd-quote-demo-silent.mp4")
    proc = subprocess.Popen([ff, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", str(silent)], stdin=subprocess.PIPE)
    for maker, seconds in SCENES:
        scene = maker()
        for index in range(seconds * FPS):
            p = index / max(1, seconds * FPS - 1)
            scale = 1 + p * .012
            rw, rh = round(W * scale), round(H * scale)
            frame = scene.resize((rw, rh), Image.Resampling.LANCZOS).crop(((rw-W)//2, (rh-H)//2, (rw+W)//2, (rh+H)//2))
            fade = min(1, p / .10, (1-p) / .10)
            if fade < 1: frame = Image.blend(Image.new("RGB", (W, H), BG), frame, max(0, fade))
            proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    if proc.wait(): raise SystemExit("Render failed")
    subprocess.run([ff, "-y", "-i", str(silent), "-stream_loop", "-1", "-i", str(MUSIC), "-filter:a", "volume=.34,afade=t=in:st=0:d=1.2,afade=t=out:st=79:d=2", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(OUT)], check=True)
    silent.unlink(missing_ok=True)
    print(OUT)


if __name__ == "__main__":
    render()
