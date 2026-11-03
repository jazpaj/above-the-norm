"""Render the order email's fixed headings as images, in the site's display font.

Gmail ignores web fonts, so an image is the only way these show in Unbounded there.
Needs Google Chrome and Pillow. Run: python3 _generator/email_headings.py
"""
import pathlib, subprocess, tempfile
from PIL import Image

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets/img/email"
FONT = "https://fonts.googleapis.com/css2?family=Unbounded:wght@700&display=swap"

# name: (html, font px, letter spacing em, flat background or None to stay transparent)
HEADINGS = {
    "hero": ('<span style="color:#f2f5ff">You\'re officially</span><br><span style="color:#f7ca35">above the norm.</span>', 54, -.03, None),
    "good-stuff": ('<span style="color:#15224f">The good stuff.</span>', 24, -.03, "#f3f5ff"),
    "headed": ('<span style="color:#14214c">Where it\'s headed</span>', 21, -.03, "#e8edfc"),
    "next": ('<span style="color:#14214c">What\'s next?</span>', 21, -.03, "#f3f5ff"),
    "wordmark": ('<span style="color:#f0f3ff">ABOVE THE NORM<sup style="font-size:.4em">®</sup></span>', 18, .02, "#101a42"),
    "tile": ('<span style="color:#263667">ATN<sup style="font-size:.45em">®</sup></span>', 15, -.02, "#dbe3fa"),
}


def render(html, size, spacing, target, tmp):
    page = pathlib.Path(tmp) / "page.html"
    page.write_text(
        f'<!doctype html><meta charset="utf-8"><link href="{FONT}" rel="stylesheet">'
        f'<body style="margin:20px;background:transparent;font:700 {size}px/1.12 Unbounded;'
        f'letter-spacing:{spacing}em;white-space:nowrap">{html}'
    )
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={tmp}/profile",
         "--force-device-scale-factor=2", "--default-background-color=00000000", "--window-size=900,240",
         "--virtual-time-budget=8000", f"--screenshot={target}", page.as_uri()],
        check=True, capture_output=True, timeout=90,
    )


OUT.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    for name, (html, size, spacing, bg) in HEADINGS.items():
        target = OUT / f"{name}.png"
        render(html, size, spacing, target, tmp)
        im = Image.open(target).convert("RGBA")
        im = im.crop(im.getbbox())
        if bg:
            flat = Image.new("RGBA", im.size, bg)
            flat.alpha_composite(im)
            im = flat.convert("RGB")
        im.save(target, optimize=True)
        print(f"{name}.png  {im.width // 2}x{im.height // 2}  {target.stat().st_size // 1024}KB")
