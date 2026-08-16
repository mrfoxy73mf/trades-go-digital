from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


root = Path(__file__).resolve().parents[1]
source = root / "public" / "images" / "tgd-office-mailroom.png"
target = root / "public" / "images" / "tgd-office-mailroom-safe.png"

image = Image.open(source).convert("RGB")
draw = ImageDraw.Draw(image)

# Clear only the sender-address row beneath the uploaded filename.
draw.rectangle((326, 505, 535, 526), fill=(255, 255, 255))
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 12)
draw.text((328, 507), "savetime@yahoo.co.uk", font=font, fill=(144, 156, 192))

image.save(target, format="PNG", optimize=True)
print(target)
