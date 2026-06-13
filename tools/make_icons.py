# -*- coding: utf-8 -*-
"""Genereert de app-iconen: een schattig paardenkopje (zelfde stijl als Hinnik)."""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

# kleuren (gelijk aan de app)
SKY_TOP = (174, 224, 255)
SKY_BOT = (224, 244, 255)
COAT = (234, 171, 104)
COAT_DK = (201, 134, 63)
MUZZLE = (246, 211, 173)
PINK = (247, 166, 160)
DARK = (58, 42, 30)
NOSE = (181, 116, 63)
WHITE = (255, 255, 255)

S = 4  # supersampling


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_bg(img, size, rounded, opaque):
    d = ImageDraw.Draw(img)
    # verticale gradient als achtergrond
    grad = Image.new("RGB", (1, size))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        gd.point((0, y), fill=lerp(SKY_TOP, SKY_BOT, y / size))
    grad = grad.resize((size, size))
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.23), fill=255)
        img.paste(grad, (0, 0), mask)
    else:
        img.paste(grad, (0, 0))


def tri(d, pts, fill):
    d.polygon(pts, fill=fill)


def draw_horse(img, cx, cy, w, h):
    """Tekent een schattig paardenkopje, gecentreerd in (cx,cy) met breedte w, hoogte h."""
    d = ImageDraw.Draw(img)

    def X(fx):
        return cx + (fx - 0.5) * w

    def Y(fy):
        return cy + (fy - 0.5) * h

    def ell(fx, fy, rx, ry, fill):
        d.ellipse([X(fx) - rx * w, Y(fy) - ry * h, X(fx) + rx * w, Y(fy) + ry * h], fill=fill)

    # manen achter de kop
    d.polygon([ (X(0.30), Y(0.30)), (X(0.14), Y(0.42)), (X(0.20), Y(0.66)),
                (X(0.12), Y(0.82)), (X(0.34), Y(0.80)), (X(0.40), Y(0.40)) ], fill=COAT_DK)
    # oren
    tri(d, [(X(0.30), Y(0.26)), (X(0.40), Y(0.02)), (X(0.50), Y(0.26))], COAT)
    tri(d, [(X(0.52), Y(0.26)), (X(0.64), Y(0.02)), (X(0.72), Y(0.26))], COAT)
    tri(d, [(X(0.35), Y(0.24)), (X(0.41), Y(0.10)), (X(0.46), Y(0.24))], PINK)
    tri(d, [(X(0.56), Y(0.24)), (X(0.63), Y(0.10)), (X(0.68), Y(0.24))], PINK)
    # kop
    ell(0.51, 0.52, 0.34, 0.40, COAT)
    # snuit
    ell(0.51, 0.72, 0.24, 0.17, MUZZLE)
    # wangen-blos
    ell(0.30, 0.58, 0.075, 0.06, PINK)
    ell(0.72, 0.58, 0.075, 0.06, PINK)
    # ogen
    ell(0.40, 0.46, 0.085, 0.10, WHITE)
    ell(0.62, 0.46, 0.085, 0.10, WHITE)
    ell(0.41, 0.48, 0.042, 0.05, DARK)
    ell(0.63, 0.48, 0.042, 0.05, DARK)
    ell(0.425, 0.46, 0.015, 0.018, WHITE)
    ell(0.645, 0.46, 0.015, 0.018, WHITE)
    # neusgaten
    ell(0.44, 0.74, 0.028, 0.035, NOSE)
    ell(0.58, 0.74, 0.028, 0.035, NOSE)
    # mond
    ell(0.51, 0.82, 0.08, 0.04, NOSE)
    # voorlokje
    tri(d, [(X(0.50), Y(0.06)), (X(0.44), Y(0.26)), (X(0.58), Y(0.24))], COAT_DK)


def make(size, mode):
    big = size * S
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    if mode == "rounded":
        draw_bg(img, big, rounded=True, opaque=False)
        draw_horse(img, big * 0.5, big * 0.52, big * 0.74, big * 0.74)
    elif mode == "maskable":
        draw_bg(img, big, rounded=False, opaque=True)
        draw_horse(img, big * 0.5, big * 0.52, big * 0.60, big * 0.60)
    elif mode == "apple":
        base = Image.new("RGBA", (big, big), (255, 255, 255, 255))
        draw_bg(base, big, rounded=False, opaque=True)
        img = base
        draw_horse(img, big * 0.5, big * 0.52, big * 0.74, big * 0.74)
        img = img.convert("RGB")
    out = img.resize((size, size), Image.LANCZOS)
    return out


make(192, "rounded").save(os.path.join(OUT, "icon-192.png"))
make(512, "rounded").save(os.path.join(OUT, "icon-512.png"))
make(512, "maskable").save(os.path.join(OUT, "icon-512-maskable.png"))
make(180, "apple").save(os.path.join(OUT, "apple-touch-icon.png"))
print("Iconen klaar in", os.path.abspath(OUT))
