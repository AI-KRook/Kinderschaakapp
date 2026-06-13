# -*- coding: utf-8 -*-
"""Genereert og-image.png (1200x630) voor delen op social media en in zoekresultaten:
Hinnik het paardje + de tekst 'Schaken leren voor kinderen'."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..")

# kleuren (gelijk aan de app)
SKY_TOP = (191, 233, 255)
SKY_BOT = (255, 247, 232)
COAT = (234, 171, 104)
COAT_DK = (201, 134, 63)
MUZZLE = (246, 211, 173)
PINK = (247, 166, 160)
DARK = (58, 42, 30)
NOSE = (181, 116, 63)
WHITE = (255, 255, 255)
INK = (74, 53, 34)
CORAL = (239, 91, 60)
INK_SOFT = (122, 100, 80)

S = 2  # supersampling


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def load_font(size):
    candidates = [
        "C:/Windows/Fonts/ARLRDBD.TTF",   # Arial Rounded MT Bold (vriendelijk)
        "C:/Windows/Fonts/segoeuib.ttf",  # Segoe UI Bold
        "C:/Windows/Fonts/arialbd.ttf",   # Arial Bold
        "arialbd.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            continue
    return ImageFont.load_default()


def tri(d, pts, fill):
    d.polygon(pts, fill=fill)


def draw_horse(img, cx, cy, w, h):
    d = ImageDraw.Draw(img)

    def X(fx):
        return cx + (fx - 0.5) * w

    def Y(fy):
        return cy + (fy - 0.5) * h

    def ell(fx, fy, rx, ry, fill):
        d.ellipse([X(fx) - rx * w, Y(fy) - ry * h, X(fx) + rx * w, Y(fy) + ry * h], fill=fill)

    d.polygon([(X(0.30), Y(0.30)), (X(0.14), Y(0.42)), (X(0.20), Y(0.66)),
               (X(0.12), Y(0.82)), (X(0.34), Y(0.80)), (X(0.40), Y(0.40))], fill=COAT_DK)
    tri(d, [(X(0.30), Y(0.26)), (X(0.40), Y(0.02)), (X(0.50), Y(0.26))], COAT)
    tri(d, [(X(0.52), Y(0.26)), (X(0.64), Y(0.02)), (X(0.72), Y(0.26))], COAT)
    tri(d, [(X(0.35), Y(0.24)), (X(0.41), Y(0.10)), (X(0.46), Y(0.24))], PINK)
    tri(d, [(X(0.56), Y(0.24)), (X(0.63), Y(0.10)), (X(0.68), Y(0.24))], PINK)
    ell(0.51, 0.52, 0.34, 0.40, COAT)
    ell(0.51, 0.72, 0.24, 0.17, MUZZLE)
    ell(0.30, 0.58, 0.075, 0.06, PINK)
    ell(0.72, 0.58, 0.075, 0.06, PINK)
    ell(0.40, 0.46, 0.085, 0.10, WHITE)
    ell(0.62, 0.46, 0.085, 0.10, WHITE)
    ell(0.41, 0.48, 0.042, 0.05, DARK)
    ell(0.63, 0.48, 0.042, 0.05, DARK)
    ell(0.425, 0.46, 0.015, 0.018, WHITE)
    ell(0.645, 0.46, 0.015, 0.018, WHITE)
    ell(0.44, 0.74, 0.028, 0.035, NOSE)
    ell(0.58, 0.74, 0.028, 0.035, NOSE)
    ell(0.51, 0.82, 0.08, 0.04, NOSE)
    tri(d, [(X(0.50), Y(0.06)), (X(0.44), Y(0.26)), (X(0.58), Y(0.24))], COAT_DK)


def fit_font(d, text, max_w, start, floor=40):
    size = start
    while size > floor:
        f = load_font(size)
        if d.textlength(text, font=f) <= max_w:
            return f
        size -= 3
    return load_font(floor)


def make():
    W, H = 1200 * S, 630 * S
    img = Image.new("RGB", (W, H), SKY_TOP)
    # verticale gradient
    grad = Image.new("RGB", (1, H))
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        gd.point((0, y), fill=lerp(SKY_TOP, SKY_BOT, y / H))
    img.paste(grad.resize((W, H)), (0, 0))

    d = ImageDraw.Draw(img)
    # zachte witte wolkjes voor sfeer
    for (cx, cy, r) in [(0.12, 0.16, 0.09), (0.30, 0.85, 0.11)]:
        d.ellipse([W * (cx - r), H * (cy - r * 1.8), W * (cx + r), H * (cy + r * 1.8)], fill=(255, 255, 255))

    # paardje links
    draw_horse(img, W * 0.205, H * 0.52, W * 0.31, H * 0.60)

    # teksten rechts, met auto-passende grootte zodat niets buiten beeld valt
    tx = int(W * 0.39)
    max_w = W - tx - 44 * S
    f_big = fit_font(d, "Schaken leren", max_w, 116 * S)
    if d.textlength("voor kinderen", font=f_big) > max_w:
        f_big = fit_font(d, "voor kinderen", max_w, 116 * S)
    f_sub = fit_font(d, "met Hinnik het paardje", max_w, 50 * S)
    f_small = fit_font(d, "Gratis, in het Nederlands, alles hardop", max_w, 40 * S)

    d.text((tx, H * 0.20), "Schaken leren", font=f_big, fill=INK)
    d.text((tx, H * 0.385), "voor kinderen", font=f_big, fill=CORAL)
    d.text((tx, H * 0.605), "met Hinnik het paardje", font=f_sub, fill=INK)
    d.text((tx, H * 0.715), "Gratis, in het Nederlands, alles hardop", font=f_small, fill=INK_SOFT)

    out = img.resize((1200, 630), Image.LANCZOS)
    out.save(os.path.join(OUT, "og-image.png"))
    print("og-image.png klaar:", out.size)


if __name__ == "__main__":
    make()
