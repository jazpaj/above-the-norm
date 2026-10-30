#!/usr/bin/env python3
"""
Generate product imagery for the placeholder SKUs in products.json.

Style target is the existing ATN catalog photography: a single product, flat/
ghost-mannequin, dead-centre on pure white, soft even light, faint contact
shadow, square crop.

Reads the key from $OPENAI_API_KEY, or _generator/.env (KEY=VALUE lines).
The key is never printed, and .env is gitignored by setup().

  python3 _generator/genimages.py --only gold-wings-tee-navy
  python3 _generator/genimages.py --limit 3
  python3 _generator/genimages.py --cat tops --quality high
  python3 _generator/genimages.py            # everything still missing
"""
import argparse, base64, concurrent.futures, io, json, os, pathlib, random, re, sys, threading, time, urllib.error, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "_generator" / "products.json"
IMGDIR = ROOT / "assets" / "img" / "products"
ENDPOINT = "https://api.openai.com/v1/images/generations"
EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits"

# Output tokens per image, used only for the cost estimate.
TOKENS = {"low": 272, "medium": 1056, "high": 4160}
RATES = {"gpt-image-1": 40.0 / 1_000_000, "gpt-image-2": 30.0 / 1_000_000}
RATE_DEFAULT = 40.0 / 1_000_000  # assume the dearer rate for unlisted models

# ---------------------------------------------------------------- style

STYLE = (
    "Single-product ecommerce catalogue photograph on a pure white (#FFFFFF) "
    "seamless background. The product is centred and fills roughly 80% of the "
    "square frame. Soft, even, diffused studio lighting with a faint natural "
    "contact shadow directly beneath the product. Sharp focus, true-to-life "
    "material texture, neutral colour grading, photorealistic. "
    "No people, no hands, no mannequin visible, no hanger, no props, no "
    "background objects, no borders, no watermark, no added text or labels."
)

# Hard guard: these products are the brand's own designs. Keep third-party
# marks out of anything generated, which also keeps the catalogue clean for
# payment-processor review.
GUARD = (
    "Do not depict any real-world company logo, sports-team mark, league "
    "insignia, celebrity likeness, or copyrighted character. Any graphic must "
    "be original artwork. "
    # Classical / Renaissance angel and statuary art is frequently nude, which
    # trips the image API's safety filter (safety_violations=[sexual]) and
    # fails the whole product. Angels and cherubs are fine — bare ones are not.
    "Every figure shown in the artwork is fully clothed in flowing robes or "
    "draped garments, depicted modestly and non-sexually. No nudity, no partial "
    "nudity, no bare torsos, no suggestive poses, no anatomical detail. "
    "No weapons, drugs or drug references."
)

# How each product type should be staged. Anything unmatched falls back to
# FORM_DEFAULT, which is the flat-lay garment treatment.
FORM_DEFAULT = (
    "The garment is laid perfectly flat and symmetrical, front facing, sleeves "
    "straight down at a slight angle, shown from directly above."
)
FORMS = {
    # Headwear — the real catalogue shoots caps dead-on from the FRONT, crown
    # square to camera, brim curving down toward the viewer. Not three-quarter.
    "Trucker Hat": "A single trucker cap photographed straight on from the front, crown square to camera, front panel flat and fully facing the lens, curved brim sweeping down toward the viewer, mesh side panels just visible at the edges.",
    "Dad Hat": "A single unstructured dad cap straight on from the front, soft low crown square to camera, curved brim toward the viewer.",
    "Corduroy Snapback": "A single corduroy snapback straight on from the front, structured crown square to camera, flat brim toward the viewer, corduroy wale clearly visible.",
    "Fitted Cap": "A single structured fitted cap straight on from the front, six-panel crown square to camera, flat brim toward the viewer.",
    "Bucket Hat": "A single bucket hat straight on from the front, upright, brim flared evenly on both sides, perfectly symmetrical.",
    "Cuffed Beanie": "A single knit beanie with a folded cuff, standing upright, photographed straight on from the front, symmetrical.",
    "Skully Beanie": "A single short knit skully beanie without a cuff, upright, straight on from the front, symmetrical.",
    "Striped Beanie": "A single knit beanie with horizontal stripes and a folded cuff, upright, straight on from the front.",
    "Five-Panel": "A single five-panel camp cap straight on from the front, crown square to camera, flat brim toward the viewer.",
    "Fuzzy Bucket Hat": "A single fuzzy textured bucket hat straight on from the front, upright, brim even on both sides, soft pile surface.",
    "Knit Headband": "A single wide knit headband laid flat in a soft oval, shown from directly above, symmetrical.",
    "Baby Rib Beanie": "A single fine-ribbed knit beanie, upright, straight on from the front, symmetrical.",
    # jewellery
    "Wallet Chain": "A single metal wallet chain arranged in a loose, elegant S-curve, shown from directly above, clasp visible.",
    "Pendant Necklace": "A single pendant necklace arranged in a neat circle with the pendant centred at the bottom, shown from above.",
    "Signet Ring": "A single signet ring standing upright, face toward camera, shallow depth of field on the engraved face.",
    "Hoop Earrings": "A matched pair of hoop earrings side by side, upright, shown front-on.",
    "Stud Earrings": "A matched pair of stud earrings side by side, face up, shown from directly above, macro detail.",
    "Charm Bracelet": "A single charm bracelet arranged in a neat circle, charms evenly spaced, shown from above.",
    # accessories
    "Crew Socks 3-Pack": "Three pairs of folded crew socks arranged in a neat fanned row, shown from directly above, cuff ribbing and toe seams visible.",
    "Tote Bag": "A single canvas tote bag standing upright and lightly filled so it holds its shape, front panel facing camera, handles upright.",
    "Crossbody Bag": "A single crossbody bag at a three-quarter front angle, strap arranged neatly behind, hardware visible.",
    "Bandana": "A single bandana laid flat as a precise square, shown from directly above, full pattern visible, edges straight.",
    "Keychain": "A single keychain laid flat, shown from directly above, ring and charm both fully visible, macro detail.",
    "Belt": "A single belt coiled in a neat spiral with the buckle centred and facing up, shown from directly above.",
    "Phone Charm": "A single phone charm laid flat, shown from directly above, strap and charm fully visible, macro detail.",
    "Hair Clip Set": "A set of matching hair clips arranged in a neat row, shown from directly above, macro detail.",
    "Enamel Pin Set": "A set of enamel pins arranged in a neat row, face up, shown from directly above, macro detail with visible enamel gloss.",
    # bottoms
    "Joggers": "The joggers laid perfectly flat and symmetrical, front facing, legs straight, shown from directly above.",
    "Sweatpants": "The sweatpants laid perfectly flat and symmetrical, front facing, legs straight, shown from directly above.",
    "Track Pants": "The track pants laid flat and symmetrical, front facing, legs straight, side stripe visible, from above.",
    "Board Shorts": "The board shorts laid flat and symmetrical, front facing, shown from directly above.",
    "Fleece Shorts": "The fleece shorts laid flat and symmetrical, front facing, shown from directly above.",
    "Cargo Pants": "The cargo trousers laid flat and symmetrical, front facing, cargo pockets clearly visible, from above.",
    "Flared Sweats": "The flared sweatpants laid flat and symmetrical, front facing, flared hem clearly visible, from above.",
    "Denim": "The jeans laid flat and symmetrical, front facing, five-pocket construction and stitching visible, from above.",
    "Flare Leggings": "The flare leggings laid flat and symmetrical, front facing, flared hem visible, from above.",
    "Biker Shorts": "The biker shorts laid flat and symmetrical, front facing, shown from directly above.",
    "Mini Skirt": "The mini skirt laid flat and symmetrical, front facing, shown from directly above.",
    "Wide-Leg Sweats": "The wide-leg sweatpants laid flat and symmetrical, front facing, from directly above.",
    # tops with specific cuts
    "Ribbed Tank": "The ribbed tank top laid flat and symmetrical, front facing, from directly above.",
    "Baby Tee": "The cropped baby tee laid flat and symmetrical, front facing, short sleeves out, from directly above.",
    "Cropped Hoodie": "The cropped hoodie laid flat and symmetrical, front facing, hood arranged neatly above the shoulders, from directly above.",
    "Cropped L/S": "The cropped long-sleeve top laid flat and symmetrical, front facing, sleeves straight down, from directly above.",
    "Hoodie": "The hoodie laid flat and symmetrical, front facing, hood arranged neatly above the shoulders, kangaroo pocket visible, sleeves straight down, from directly above.",
    "Zip Hoodie": "The zip-up hoodie laid flat and symmetrical, front facing, full-length zipper closed and centred, hood above the shoulders, from directly above.",
    "Mesh Jersey": "The mesh jersey laid flat and symmetrical, front facing, visible mesh perforation, from directly above.",
    "Work Shirt": "The work shirt laid flat and symmetrical, front facing, button placket centred, collar flat, chest pockets visible, from directly above.",
    "Ringer Tee": "The ringer tee laid flat and symmetrical, front facing, contrast ribbing at collar and sleeve cuffs clearly visible, from directly above.",
}

# Views 2 and 3 are generated as EDITS of view 1, so the wording addresses the
# reference image directly. Generating them from text alone would produce three
# different products rather than three views of one.
SAME = (
    "The attached reference image shows the exact product. Reproduce that SAME "
    "product with identical colour, fabric, cut, proportions, artwork and "
    "lighting, on the same pure white background, in the same square format. "
    "Change ONLY the camera angle or crop as described below."
)
VIEW2_GARMENT = SAME + " Show the BACK of the garment, laid flat in the same way, with no chest graphic visible."
VIEW2_OTHER = SAME + " Rotate the product to show its reverse or opposite side."
# Caps and beanies get their own back view: the real catalogue shows the mesh
# back panels and the adjuster strap dead-on, mirroring the front shot.
VIEW2_HEADWEAR = SAME + (
    " Show the BACK of the same headwear, photographed straight on from behind, "
    "square to camera and symmetrical. For a cap, the mesh or fabric back panels "
    "and the adjuster strap with its opening are clearly visible. No front "
    "graphic is visible from this angle."
)

# View 3 in the real catalogue is NOT a product shot — it is a lifestyle frame
# with a person, and crucially it is NOT uniform: the real photos range from
# bright studio cyc to night flash on a brick ledge to a chain-link fence in
# daylight. A single fixed prompt makes 180 near-identical images, so every
# element below is sampled per product.

# Setting and light are paired — sampling them independently produced
# contradictions like "after dark" lit by "golden-hour sun". `sit` marks scenes
# that actually have something to sit on, so seated poses only appear there.
SCENES = [
    dict(setting="a clean white studio cyclorama, the model's hard shadow thrown onto the wall behind",
         light="bright even studio lighting with one crisp hard shadow", sit=False),
    dict(setting="a clean white studio backdrop, nothing else in frame",
         light="soft even studio light, minimal shadow", sit=False),
    dict(setting="a plain off-white interior wall lit by a window just out of frame",
         light="diffused window light, gentle contrast", sit=False),
    dict(setting="a chain-link fence on a quiet residential street, white clapboard siding behind",
         light="soft natural daylight under light overcast", sit=False),
    dict(setting="a low red-brick ledge outdoors after dark, dry grass and a wooden fence behind",
         light="direct on-camera flash at night, background falling off into darkness", sit=True),
    dict(setting="a sunlit concrete alley wall, faded graffiti thrown out of focus behind",
         light="harsh midday sun, strong contrast and deep shadow", sit=False),
    dict(setting="an empty parking lot, long shadows stretched across the asphalt",
         light="warm golden-hour sun raking across the frame", sit=False),
    dict(setting="a warm stucco wall in late-afternoon sun",
         light="warm golden-hour sun, soft long shadows", sit=False),
    dict(setting="the fence line of an outdoor basketball court at dusk",
         light="cool fading dusk light, low contrast", sit=False),
    dict(setting="a plain corrugated garage door",
         light="flat overcast daylight, even and cool", sit=False),
    dict(setting="a palm-lined Los Angeles sidewalk",
         light="soft warm evening light", sit=False),
    dict(setting="a bare concrete stairwell",
         light="flat blue-grey shade, even and cool", sit=True),
    dict(setting="a roadside kerb with a beige apartment block behind, camera slightly below eye level",
         light="bright hazy afternoon sun", sit=True),
    dict(setting="a weathered wooden fence in a back yard at night",
         light="hard on-camera flash, deep black background", sit=False),
]
POSES_STAND = [
    "standing square to camera, hands clasped loosely in front",
    "standing with both hands in trouser pockets, weight on one leg",
    "leaning back against the wall, one shoulder touching it, head turned aside",
    "caught mid-stride walking toward camera, eyes down",
    "an elbow hooked over a fence rail, body relaxed and open",
    "arms folded, looking straight down the lens",
    "half-turned away, looking back over the shoulder",
    "one hand raised adjusting the collar or brim, eyes off camera",
]
POSES_SIT = [
    "seated, forearms resting across the knees, looking off camera",
    "seated with legs stretched out, leaning back on one hand",
    "seated side-on, head turned toward the lens",
    "crouched on the balls of the feet, glancing to one side",
]
FRAMES = [
    "framed from mid-thigh up",
    "framed from the waist up",
    "a full-body frame with generous headroom",
    "a three-quarter body crop",
    "a loose chest-up portrait",
]
MEN = [
    "a Black man in his mid-20s with short locs",
    "a Black man in his late 20s, low fade and a trimmed beard",
    "a Latino man in his early 20s with dark curly hair",
    "an East Asian man in his mid-20s with straight black hair",
    "a white man in his late 20s with messy mid-length brown hair",
    "a mixed-race man in his 20s with box braids",
    "a South Asian man in his mid-20s with a short crop and stubble",
]
WOMEN = [
    "a Black woman in her mid-20s with long braids",
    "a Latina woman in her early 20s with long dark hair",
    "an East Asian woman in her mid-20s with a blunt bob",
    "a white woman in her late 20s with wavy blonde hair",
    "a mixed-race woman in her 20s with natural curls",
    "a Black woman in her late 20s with a short natural afro",
]
FILM = [
    "shot on 35mm film, visible grain, slightly muted colour",
    "clean digital capture, natural colour",
    "shot on film with a warm cast and soft grain",
    "crisp digital studio capture, neutral colour",
    "grainy high-ISO night film look",
]


def lifestyle_prompt(p):
    """A varied lifestyle frame. Seeded by product id: stable across re-runs,
    different for every product."""
    rnd = random.Random("atn-v3-" + p["id"])
    genders = p.get("gender") or ["men", "women"]
    pool = (MEN if "men" in genders else []) + (WOMEN if "women" in genders else [])
    model = rnd.choice(pool or MEN + WOMEN)
    worn = "wears the product" if p.get("cat") in GARMENT_CATS or p.get("cat") == "headwear" \
        else "wears or holds the product so it reads clearly"
    scene = rnd.choice(SCENES)
    pose = rnd.choice(POSES_SIT if scene["sit"] and rnd.random() < 0.7 else POSES_STAND)
    return (
        "The attached reference image shows the exact product. Keep its colour, "
        "cut, proportions and artwork identical, but photograph it as a candid "
        "lifestyle / editorial catalogue frame rather than a product shot.\n\n"
        f"MODEL: {model}, who {worn}.\n"
        f"SETTING: {scene['setting']}.\n"
        f"LIGHT: {scene['light']}.\n"
        f"POSE: {pose}.\n"
        f"FRAMING: {rnd.choice(FRAMES)}, square format.\n"
        f"TREATMENT: {rnd.choice(FILM)}.\n\n"
        "The featured product is the focus of the frame and its artwork is "
        "readable. Other garments are plain, understated and carry no visible "
        "branding. No text overlay, no watermark.\n\n"
        "ANATOMY: the person is anatomically correct and complete. Both arms "
        "and both hands are present, fully formed and visible in the frame, "
        "attached naturally at the shoulders. Five fingers per hand. No missing, "
        "extra, merged or malformed limbs or digits, no detached body parts. "
        "Natural skin texture, no beauty-filter retouching."
    )

GARMENT_CATS = {"tops", "bottoms"}

# The real catalogue's artwork is stylistically all over the place — airbrushed
# photoreal angels, monochrome line engraving, gothic metal type, fat block
# lettering with no image at all. Describing one house style for every product
# makes 180 prints that look like the same shirt, so art direction is sampled.
ART_STYLES = [
    "a soft airbrushed photo-realistic angel painting in full colour with glowing highlights, set behind outlined display lettering",
    "fine black line-art engraving with etched crosshatch shading and a ribbon banner carrying the words — monochrome line only, no solid fills",
    "heavy gothic blackletter lettering arched over a detailed illustration, high contrast, vintage metal-poster feel",
    "large stacked block capitals in a puffy outlined cartoon face, three lines deep, with no illustration at all",
    "a vintage collegiate varsity arch above a script wordmark, lightly distressed print texture",
    "Y2K chrome lettering with liquid-metal reflections and a small lens-flare star",
    "a coarse halftone photo-collage of clouds and classical statuary, printed as a duotone",
    "a small, restrained embroidered-style crest, minimal and understated",
    "a Renaissance fresco detail reproduced large as a full-colour print",
    "spray-paint graffiti handstyle lettering with drips and a contrasting outline",
    "a 90s rap-tee layout — a large central image, arched text above it, a straight line of text beneath",
    "a single continuous-contour line drawing in one thin ink colour, very minimal",
    "a faded vintage-wash print that looks cracked and worn from years of washing",
    "bold horizontal text bars stacked like a shipping label, purely typographic",
]
INKS = [
    "printed in a single white ink",
    "printed in a single black ink",
    "a two-colour print in cream and a muted accent tone",
    "a full-colour photographic print",
    "a tonal print only a shade or two off the garment colour",
    "printed in metallic gold ink",
    "a soft puff print in an off-white",
    "a two-colour print in red and black",
    "printed in a washed pastel blue",
]
# Much of the real catalogue carries the brand wordmark in the print itself.
# Sampled so it appears on most products but not all — a catalogue where every
# single piece shouts the logo looks as fake as one where none do.
BRANDING = [
    'The brand wordmark "ABOVE THE NORM" arcs above the artwork in the same ink.',
    'A small boxed "ABOVE THE NORM" logotype sits directly beneath the artwork.',
    'The words "ABOVE THE NORM" are set large in display type as the dominant element, with the artwork behind and around them.',
    'A compact "ATN" monogram sits tucked beside the artwork.',
    'A small credit line reading "ABOVE THE NORM © HOLLYWOOD, CA" sits under the artwork.',
    'The wordmark "ABOVE THE NORM" runs in a straight line beneath the artwork, letter-spaced wide.',
    'An "ATN" monogram is worked into the artwork itself as part of the composition.',
]

PRINT_SCALES = [
    "a large front hit spanning most of the chest",
    "a modest centre-chest print about a third of the garment's width, sitting high below the collar",
    "a small left-chest hit only, with the rest of the garment blank",
    "a wide chest band print running shoulder to shoulder",
    "an oversized print running from the chest down toward the hem",
]


def describe(p):
    """Turn a catalogue row into the product half of the prompt."""
    name = p.get("name", "").strip()
    colour = (p.get("color") or "").strip()
    ptype = (p.get("type") or "").strip()
    details = [d for d in (p.get("details") or []) if d]

    bits = []
    label = f"{name}" + (f" in {colour}" if colour else "")
    bits.append(f"PRODUCT: {label}.")
    if ptype:
        bits.append(f"Product type: {ptype}.")
    if colour:
        bits.append(f"The product's colourway is {colour}; render that colour accurately and consistently.")
    if details:
        bits.append("Construction: " + "; ".join(details) + ".")

    # The name carries the design concept — let it drive the artwork without
    # inventing third-party marks. The type is already stated separately, so
    # strip it off the name rather than word-matching every garment noun
    # ("Mothership Signet Ring" - "Signet Ring" = "Mothership").
    graphic = name
    if ptype:
        graphic = re.sub(re.escape(ptype) + r"\s*$", "", graphic, flags=re.I).strip()
    graphic = re.sub(r"\b(tee|crewneck|hoodie|jersey|shirt|joggers|sweatpants|"
                     r"pants|shorts|denim|leggings|skirt|tank|hat|cap|beanie|"
                     r"snapback|headband|bag|socks|bandana|keychain|belt|charm|"
                     r"earrings|ring|necklace|bracelet|chain|set|pack)\s*$",
                     "", graphic, flags=re.I).strip(" -–—")
    # Art direction is sampled per product (seeded by id) so the catalogue does
    # not read as 180 variations of one shirt.
    rnd = random.Random("atn-art-" + p["id"])
    # "ATN" already in the product name means it is explicitly a branded piece.
    named = "atn" in name.lower() or "above the norm" in name.lower()
    brand = rnd.choice(BRANDING) if (named or rnd.random() < 0.62) else ""

    if graphic and p.get("cat") in GARMENT_CATS:
        bits.append(
            f'The screen-printed graphic expresses the theme "{graphic}" as '
            f"original artwork, drawn as {rnd.choice(ART_STYLES)}, "
            f"{rnd.choice(INKS)}. It is {rnd.choice(PRINT_SCALES)}. "
            "The artwork must read clearly against the garment colour."
        )
        if brand:
            bits.append(brand + " Spell the wordmark exactly, in clean legible type.")
    elif graphic:
        bits.append(
            f'Any branding or motif on the product expresses the theme "{graphic}" '
            f"as original artwork, in the spirit of {rnd.choice(ART_STYLES)}."
        )
        if brand:
            bits.append(
                'The product carries a small "ABOVE THE NORM" or "ATN" brand mark, '
                "spelled exactly, in clean legible type."
            )
    return " ".join(bits)


def build_prompt(p, view=1):
    cat = p.get("cat")
    form = FORMS.get((p.get("type") or "").strip(), FORM_DEFAULT)
    if view == 3:
        # Lifestyle frame: STYLE's "no people, white seamless" rules don't apply.
        return "\n\n".join([lifestyle_prompt(p), describe(p), GUARD])
    parts = [STYLE, form, describe(p), GUARD]
    if view == 2:
        if cat in GARMENT_CATS:
            v2 = VIEW2_GARMENT
        elif cat == "headwear":
            v2 = VIEW2_HEADWEAR
        else:
            v2 = VIEW2_OTHER
        parts.insert(2, v2)
    return "\n\n".join(parts)


# ---------------------------------------------------------------- api

def load_key():
    """_generator/.env wins over the environment.

    A stale OPENAI_API_KEY exported from a shell profile otherwise silently
    shadows the .env file you just wrote, which looks exactly like the new
    key not working.
    """
    envf = ROOT / "_generator" / ".env"
    if envf.exists():
        for line in envf.read_text().splitlines():
            line = line.strip()
            if line.startswith("OPENAI_API_KEY") and "=" in line:
                k = line.split("=", 1)[1].strip().strip("'\"")
                if k:
                    return k
    k = os.environ.get("OPENAI_API_KEY", "").strip()
    if k:
        return k
    sys.exit("No OPENAI_API_KEY in _generator/.env or the environment")


def generate(key, prompt, model, quality, size, attempts=4):
    body = json.dumps({
        "model": model, "prompt": prompt, "n": 1,
        "size": size, "quality": quality,
    }).encode()
    last = None
    for i in range(attempts):
        req = urllib.request.Request(
            ENDPOINT, data=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                d = json.load(r)
            return base64.b64decode(d["data"][0]["b64_json"])
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:300]
            last = f"HTTP {e.code}: {detail}"
            # Don't burn retries on errors that will never resolve themselves.
            if e.code in (400, 401, 403) and "rate" not in detail.lower():
                raise RuntimeError(last)
        except Exception as e:  # transient: timeouts, resets
            last = f"{type(e).__name__}: {e}"
        if i < attempts - 1:
            time.sleep((2 ** i) * 2 + random.random())
    raise RuntimeError(last or "unknown failure")


def _multipart(fields, files):
    """Minimal multipart/form-data encoder (stdlib only)."""
    b = f"----genimages{random.getrandbits(48):012x}"
    out = bytearray()
    for k, v in fields.items():
        out += f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    for k, (fn, data, ctype) in files.items():
        out += (f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"; "
                f"filename=\"{fn}\"\r\nContent-Type: {ctype}\r\n\r\n").encode()
        out += data + b"\r\n"
    out += f"--{b}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={b}"


def edit(key, prompt, ref_png, model, quality, size, attempts=4):
    """Generate a new view conditioned on a reference image of the same product."""
    body, ctype = _multipart(
        {"model": model, "prompt": prompt, "n": "1", "size": size, "quality": quality},
        {"image": ("reference.png", ref_png, "image/png")},
    )
    last = None
    for i in range(attempts):
        req = urllib.request.Request(
            EDIT_ENDPOINT, data=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": ctype},
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                d = json.load(r)
            return base64.b64decode(d["data"][0]["b64_json"])
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:300]
            last = f"HTTP {e.code}: {detail}"
            if e.code in (400, 401, 403) and "rate" not in detail.lower():
                raise RuntimeError(last)
        except Exception as e:
            last = f"{type(e).__name__}: {e}"
        if i < attempts - 1:
            time.sleep((2 ** i) * 2 + random.random())
    raise RuntimeError(last or "unknown failure")


def as_png(raw):
    """Normalise model output to PNG bytes for use as an edit reference."""
    from PIL import Image
    buf = io.BytesIO()
    Image.open(io.BytesIO(raw)).convert("RGB").save(buf, "PNG")
    return buf.getvalue()


def to_webp(raw, path, quality=88):
    from PIL import Image
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=quality, method=6)
    return path.stat().st_size


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="single product id")
    ap.add_argument("--cat", help="tops | bottoms | headwear | accessories")
    ap.add_argument("--limit", type=int, help="stop after N products")
    ap.add_argument("--views", type=int, default=1, choices=(1, 2, 3))
    ap.add_argument("--quality", default="medium", choices=("low", "medium", "high"),
                    help="quality for view 1, the catalogue thumbnail")
    ap.add_argument("--quality-alt", default="low", choices=("low", "medium", "high"),
                    help="quality for view 2 (blank garment back)")
    ap.add_argument("--quality-life", default="medium", choices=("low", "medium", "high"),
                    help="quality for view 3; it contains a person, and low quality mangles anatomy")
    ap.add_argument("--redo-view", type=int, choices=(2, 3),
                    help="regenerate only this view, reusing the existing view 1 on disk as reference")
    ap.add_argument("--size", default="1024x1024")
    ap.add_argument("--model", default="gpt-image-2")
    ap.add_argument("--force", action="store_true", help="regenerate even if images exist")
    ap.add_argument("--workers", type=int, default=6, help="products generated in parallel")
    ap.add_argument("--dry-run", action="store_true", help="print prompts, call nothing")
    a = ap.parse_args()

    catalog = json.loads(CATALOG.read_text())
    todo = []
    for p in catalog:
        if a.only:
            if p["id"] != a.only:
                continue
        else:
            if not p.get("placeholder"):
                continue
            if a.cat and p.get("cat") != a.cat:
                continue
            if a.redo_view:
                # Only products that already have a full set can have one view redone.
                if len(p.get("images") or []) < 3:
                    continue
            # View-aware: a product with 1 image still needs work when 3 are asked for.
            elif len(p.get("images") or []) >= a.views and not a.force:
                continue
        todo.append(p)
    if a.limit:
        todo = todo[: a.limit]

    if not todo:
        print("Nothing to do.")
        return

    n = len(todo) * (1 if a.redo_view else a.views)
    rate = RATES.get(a.model, RATE_DEFAULT)
    if a.redo_view:
        per = TOKENS[a.quality_alt if a.redo_view == 2 else a.quality_life]
    else:
        per = TOKENS[a.quality]
        if a.views >= 2: per += TOKENS[a.quality_alt]
        if a.views >= 3: per += TOKENS[a.quality_life]
    est = len(todo) * per * rate
    print(f"{len(todo)} product(s) x {a.views} view(s) = {n} image(s)")
    print(f"{a.model} / view1={a.quality} views2-3={a.quality_alt} / {a.size}"
          f" — rough estimate ${est:,.2f}\n")

    if a.dry_run:
        for p in todo:
            for v in range(1, a.views + 1):
                print("=" * 70)
                print(f"{p['id']}  view {v}")
                print("=" * 70)
                print(build_prompt(p, v), "\n")
        return

    key = load_key()
    lock = threading.Lock()
    counts = {"ok": 0, "fail": 0, "n": 0}

    def work(p):
        """One product: view 1 generated, later views edited from it.

        Views are sequential within a product (2 and 3 need view 1 as the
        reference), but products are independent and run concurrently.
        """
        names = []
        try:
            if a.redo_view:
                # Reuse the view 1 already on disk rather than regenerating the
                # whole set, so fixing one bad view costs one call, not three.
                v = a.redo_view
                src = IMGDIR / f"{p['id']}-1.webp"
                if not src.exists():
                    raise RuntimeError("no view 1 on disk to use as reference")
                q = a.quality_alt if v == 2 else a.quality_life
                raw = edit(key, build_prompt(p, v), as_png(src.read_bytes()),
                           a.model, q, a.size)
                to_webp(raw, IMGDIR / f"{p['id']}-{v}.webp")
                with lock:
                    counts["ok"] += 1
                    counts["n"] += 1
                    print(f"[{counts['n']}/{len(todo)}] {p['id']}  view {v} redone", flush=True)
                return

            ref = None
            for v in range(1, a.views + 1):
                fn = f"{p['id']}-{v}.webp"
                # View 1 is the catalogue thumbnail and carries the detail that
                # matters; views 2-3 (blank back, lifestyle) run cheaper.
                q = {1: a.quality, 2: a.quality_alt, 3: a.quality_life}[v]
                if v == 1:
                    raw = generate(key, build_prompt(p, v), a.model, q, a.size)
                    ref = as_png(raw)
                else:
                    raw = edit(key, build_prompt(p, v), ref, a.model, q, a.size)
                to_webp(raw, IMGDIR / fn)
                names.append(fn)
            with lock:
                p["images"] = names
                counts["ok"] += 1
                counts["n"] += 1
                # Persist as we go so an interrupted run keeps its work.
                CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n")
                print(f"[{counts['n']}/{len(todo)}] {p['id']}  {len(names)} views", flush=True)
        except Exception as e:
            with lock:
                counts["fail"] += 1
                counts["n"] += 1
                print(f"[{counts['n']}/{len(todo)}] {p['id']}  FAILED: {e}",
                      file=sys.stderr, flush=True)

    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as ex:
        list(ex.map(work, todo))

    mins = (time.time() - t0) / 60
    print(f"\ndone in {mins:.1f} min: {counts['ok']} ok, {counts['fail']} failed")
    ok = counts["ok"]
    if ok:
        print("catalog updated — rebuild with:  python3 _generator/build.py")


if __name__ == "__main__":
    main()
