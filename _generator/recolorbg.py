#!/usr/bin/env python3
"""
Recolour the white studio background of generated product shots.

Only views 1 and 2 are touched — view 3 is a lifestyle frame with a real
environment, which has no white backdrop to replace.

The background is found by flood-filling inward from the border, so white
*inside* the product (a white tee, the white front panel of a cap) is left
alone. Replacement is a multiply blend rather than a flat fill, so the soft
contact shadow survives as a darker shade of the new colour instead of being
stamped out.

  python3 _generator/recolorbg.py --limit 2 --out-suffix _test   # preview
  python3 _generator/recolorbg.py                                # all, in place
"""
import argparse, json, pathlib, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "_generator" / "products.json"
IMGDIR = ROOT / "assets" / "img" / "products"

SENTINEL = (255, 0, 255)  # magenta: not present in these photographs


def hex_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def background_mask(im, thresh, near_white):
    """White region connected to the border, as a feathered L mask."""
    work = im.copy()
    w, h = work.size
    px = work.load()

    # Seed every few pixels along all four edges — a product that touches one
    # border still leaves the rest of the frame floodable.
    seeds = []
    step = max(1, w // 40)
    for x in range(0, w, step):
        seeds += [(x, 0), (x, h - 1)]
    for y in range(0, h, step):
        seeds += [(0, y), (w - 1, y)]

    for s in seeds:
        p = px[s]
        if p == SENTINEL:
            continue  # already flooded
        if min(p[:3]) >= near_white:
            ImageDraw.floodfill(work, s, SENTINEL, thresh=thresh)

    # Sentinel pixels become the mask.
    r, g, b = work.split()[:3]
    mask = Image.eval(
        ImageChops.multiply(
            ImageChops.multiply(r.point(lambda v: 255 if v > 250 else 0),
                                g.point(lambda v: 255 if v < 5 else 0)),
            b.point(lambda v: 255 if v > 250 else 0)),
        lambda v: v)
    # The flood fill stops at the first non-white pixel, so the antialiased
    # rim where product meets backdrop stays white and reads as a halo.
    # Dilate the mask a couple of pixels to swallow that rim, then feather.
    # Those rim pixels are part backdrop anyway, so tinting them is correct.
    mask = mask.filter(ImageFilter.MaxFilter(9))
    return mask.filter(ImageFilter.GaussianBlur(1.6))


def recolour(path, target, thresh, near_white, out=None):
    im = Image.open(path).convert("RGB")
    mask = background_mask(im, thresh, near_white)

    # Guard: if almost nothing or almost everything matched, the flood fill
    # misread the image — leave it untouched rather than wreck it.
    frac = sum(mask.point(lambda v: 1 if v > 128 else 0)
               .getdata()) / float(im.size[0] * im.size[1])
    if not 0.05 < frac < 0.97:
        return None, frac

    solid = Image.new("RGB", im.size, target)
    tinted = ImageChops.multiply(im, solid)  # white -> target, shadow -> darker target
    result = Image.composite(tinted, im, mask)
    result.save(out or path, "WEBP", quality=88, method=6)
    return (out or path), frac


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--color", default="#E9E1CF")
    ap.add_argument("--views", default="1,2", help="which views to recolour")
    ap.add_argument("--thresh", type=int, default=32, help="flood-fill tolerance")
    ap.add_argument("--near-white", type=int, default=235,
                    help="a border pixel this bright or brighter seeds the fill")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--only")
    ap.add_argument("--out-suffix", default="", help="write beside the original instead of in place")
    ap.add_argument("--include-real", action="store_true",
                    help="also process the 65 real products (default: generated only)")
    a = ap.parse_args()

    target = hex_rgb(a.color)
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

    print(f"{len(todo)} image(s) -> {a.color} {target}, views {views}\n")
    ok = skipped = 0
    for i, f in enumerate(todo, 1):
        out = f.with_name(f.stem + a.out_suffix + f.suffix) if a.out_suffix else None
        res, frac = recolour(f, target, a.thresh, a.near_white, out)
        if res is None:
            skipped += 1
            print(f"[{i}/{len(todo)}] {f.name}  SKIPPED (background {frac:.0%} — unsafe)")
        else:
            ok += 1
            if i % 25 == 0 or a.limit:
                print(f"[{i}/{len(todo)}] {f.name}  bg {frac:.0%}")
    print(f"\ndone: {ok} recoloured, {skipped} skipped")


if __name__ == "__main__":
    main()
