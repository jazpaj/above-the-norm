#!/usr/bin/env python3
"""
Zoom out generated product shots so they sit in the frame like the real ones.

The generated images crop tight: the product covers ~95% of the frame against
~76% in the real catalogue, so they read as larger and more cramped in the grid.
This scales the whole image down and pads the margin with the backdrop colour.

Scaling the entire image (rather than re-centring each product to a fixed
extent) keeps the natural variation between products instead of making every
tile identical.

Views 1 and 2 only — view 3 is a lifestyle frame whose composition already
matches.

  python3 _generator/reframe.py --limit 2 --out-suffix _test   # preview
  python3 _generator/reframe.py                                # all, in place
"""
import argparse, json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "_generator" / "products.json"
IMGDIR = ROOT / "assets" / "img" / "products"


def hex_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def reframe(path, scale, bg, out=None):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    small = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (w, h), bg)
    canvas.paste(small, ((w - nw) // 2, (h - nh) // 2))
    canvas.save(out or path, "WEBP", quality=88, method=6)
    return out or path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scale", type=float, default=0.795,
                    help="measured: real products fill ~76%% of frame, generated ~95%%")
    ap.add_argument("--color", default="#E9E1CF")
    ap.add_argument("--views", default="1,2")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--only")
    ap.add_argument("--out-suffix", default="")
    ap.add_argument("--include-real", action="store_true")
    a = ap.parse_args()

    bg = hex_rgb(a.color)
    views = [int(v) for v in a.views.split(",")]
    catalog = json.loads(CATALOG.read_text())

    todo = []
    for p in catalog:
        if a.only and p["id"] != a.only:
            continue
        if not a.only and not p.get("placeholder") and not a.include_real:
            continue
        for v in views:
            for fn in (p.get("images") or []):
                if fn.endswith(f"-{v}.webp") and (IMGDIR / fn).exists():
                    todo.append(IMGDIR / fn)
    if a.limit:
        todo = todo[: a.limit]

    print(f"{len(todo)} image(s) — scale {a.scale}, pad {a.color}, views {views}\n")
    for i, f in enumerate(todo, 1):
        out = f.with_name(f.stem + a.out_suffix + f.suffix) if a.out_suffix else None
        reframe(f, a.scale, bg, out)
        if i % 50 == 0 or a.limit:
            print(f"[{i}/{len(todo)}] {f.name}")
    print(f"\ndone: {len(todo)} reframed")


if __name__ == "__main__":
    main()
