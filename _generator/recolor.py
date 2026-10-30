"""Usage: python _generator/recolor.py IMAGE... (needs numpy, scipy, pillow).
Swap a photo's flat studio backdrop (and its soft shadows) for the new tile colour.

The backdrop is found by growing from flat backdrop pixels across smooth steps only, so product
edges (which jump in colour) stop the fill. Backdrop pixels are scaled by TILE/backdrop, which keeps
shadows as shadows, just cool instead of warm. A 1px rim is half-blended to avoid halos.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

TILE = np.array([220, 230, 241], float)       # --tile #DCE6F1

def backdrop_mask(a, bg, step=3, seed_tol=3, depth=0.45, ctol=0.010, ceil=4):
    h, w, _ = a.shape
    lum = a.sum(2); bl = bg.sum()
    chroma = a / np.maximum(lum[..., None], 1); bc = bg / bl
    cand = (lum <= bl + ceil)   # backdrop and shadows are never lighter than the flat backdrop
    cand &= (lum >= depth * bl) & (np.abs(chroma - bc).max(2) < ctol)
    seeds = cand & (np.abs(a - bg).max(2) <= seed_tol)
    # connectivity graph on a 2x grid: pixel cells + edge cells (edge open only if the step is smooth)
    g = np.zeros((2*h - 1, 2*w - 1), bool)
    g[::2, ::2] = cand
    dh = np.abs(a[:, 1:] - a[:, :-1]).max(2) <= step
    dv = np.abs(a[1:] - a[:-1]).max(2) <= step
    g[::2, 1::2] = cand[:, 1:] & cand[:, :-1] & dh
    g[1::2, ::2] = cand[1:] & cand[:-1] & dv
    lab, _ = ndimage.label(g)
    keep = np.unique(lab[::2, ::2][seeds]); keep = keep[keep > 0]
    return np.isin(lab[::2, ::2], keep)

def cut_gaps(m, r):
    """Drop backdrop that only reaches in through gaps narrower than 2r (e.g. into cream garments)."""
    e = ndimage.binary_erosion(m, iterations=r, border_value=1)
    lab, _ = ndimage.label(e)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); edge = edge[edge > 0]
    return m & (ndimage.distance_transform_edt(~np.isin(lab, edge)) <= r + 2)

def recolor(path, bg=None, out=None, cut=0, step=3):
    im = Image.open(path).convert("RGB"); a = np.asarray(im).astype(float)
    if bg is None:
        b = np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
        bg = np.median(b, 0)
    m = backdrop_mask(a, np.asarray(bg, float), step=step)
    if cut: m = cut_gaps(m, cut)
    ratio = TILE / np.asarray(bg, float)
    res = a.copy()
    res[m] = a[m] * ratio
    # soft edge: up to 3px outside the backdrop, blend in proportion to how backdrop-like the colour is
    dist = ndimage.distance_transform_edt(~m)
    lum = a.sum(2); chroma = a / np.maximum(lum[..., None], 1); bc = np.asarray(bg, float) / np.sum(bg)
    like = np.clip(1 - np.abs(chroma - bc).max(2) / 0.04, 0, 1)
    wgt = np.where((dist > 0) & (dist <= 3), like * (1 - (dist - 1) / 3), 0)[..., None]
    res = np.where(wgt > 0, a * (1 + (ratio - 1) * wgt), res)
    Image.fromarray(np.clip(res, 0, 255).round().astype(np.uint8)).save(out or path, "WEBP", quality=92, method=6)
    return m.mean()

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(p.split("/")[-1], round(recolor(p), 3))
