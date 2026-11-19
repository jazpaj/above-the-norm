"""Make the product photos shown in the order email, from each product's first photo.

The site's photos are WebP, which Outlook on Windows can't display, so the email uses small JPEGs.
Run after adding products: python3 _generator/email_thumbs.py
"""
import json, pathlib, re
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/img/email/products"
SIZE = 168  # twice the size it shows at, for sharp phone screens
TILE = "#DCE6F1"  # the site's product tile colour

catalog = json.loads((ROOT / "mail/catalog.json").read_text())  # written by build_site.mjs
OUT.mkdir(parents=True, exist_ok=True)
for pid, p in catalog["products"].items():
    # Some photos have transparent backgrounds, which a JPEG would turn black.
    src = Image.open(ROOT / p["i"]).convert("RGBA")
    im = Image.alpha_composite(Image.new("RGBA", src.size, TILE), src).convert("RGB")
    ImageOps.pad(im, (SIZE, SIZE), Image.LANCZOS, color=im.getpixel((2, 2))).save(OUT / f"{pid}.jpg", quality=84, optimize=True)
print(len(catalog["products"]), "thumbnails")
