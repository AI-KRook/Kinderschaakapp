# -*- coding: utf-8 -*-
"""Tekent vriendelijke, ronde schaakstukken (zelfde warme stijl als Hinnik) als
PNG's: 6 soorten x 2 kleuren. Een nette omlijning komt via uitdijen (dilatie)
van de silhouet-mask, zodat er geen lelijke binnenlijnen ontstaan.
Maakt ook pieces/_preview.png om het resultaat te bekijken.
Gebruik: python tools/make_pieces.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "pieces")
os.makedirs(OUT, exist_ok=True)

WHITE_FILL = (253, 243, 223); WHITE_LINE = (74, 56, 43)
BLACK_FILL = (67, 52, 42);   BLACK_LINE = (24, 16, 10)
SQ_LIGHT = (251, 233, 196);  SQ_DARK = (139, 194, 143)

S = 4            # supersampling
U = 120          # logisch canvas (0..120)
W = U * S
OUT_PX = 160     # eindgrootte per stuk


def sc(v): return int(round(v * S))


def E(d, x0, y0, x1, y1): d.ellipse([sc(x0), sc(y0), sc(x1), sc(y1)], fill=255)
def RR(d, x0, y0, x1, y1, r): d.rounded_rectangle([sc(x0), sc(y0), sc(x1), sc(y1)], radius=sc(r), fill=255)
def POLY(d, pts): d.polygon([(sc(x), sc(y)) for x, y in pts], fill=255)


def pawn(d):
    E(d, 42, 14, 78, 50)
    RR(d, 45, 46, 75, 58, 6)
    POLY(d, [(46, 56), (74, 56), (82, 90), (38, 90)])
    RR(d, 28, 86, 92, 104, 9)


def rook(d):
    RR(d, 30, 24, 44, 42, 2); RR(d, 53, 24, 67, 42, 2); RR(d, 76, 24, 90, 42, 2)
    RR(d, 28, 40, 92, 52, 3)
    POLY(d, [(38, 52), (82, 52), (88, 90), (32, 90)])
    RR(d, 26, 86, 94, 106, 9)


def bishop(d):
    E(d, 53, 10, 67, 24)
    E(d, 42, 22, 78, 86)
    RR(d, 46, 80, 74, 92, 5)
    RR(d, 28, 90, 92, 108, 9)


def queen(d):
    for cx in (34, 47, 60, 73, 86):
        E(d, cx - 7, 14, cx + 7, 28)
    RR(d, 30, 26, 90, 42, 4)
    POLY(d, [(36, 42), (84, 42), (90, 90), (30, 90)])
    RR(d, 24, 86, 96, 106, 9)


def king(d):
    RR(d, 55, 6, 65, 34, 3); RR(d, 47, 14, 73, 24, 3)
    RR(d, 34, 34, 86, 48, 4)
    POLY(d, [(40, 48), (80, 48), (86, 90), (34, 90)])
    RR(d, 26, 86, 94, 106, 9)


def knight(d):
    POLY(d, [
        (40, 104), (38, 66), (42, 46), (35, 40), (40, 27), (50, 36),
        (58, 22), (65, 38), (77, 40), (93, 53), (90, 63), (75, 63),
        (69, 67), (66, 80), (64, 104)
    ])
    RR(d, 30, 98, 90, 112, 8)


SHAPES = {"p": pawn, "r": rook, "n": knight, "b": bishop, "q": queen, "k": king}


def render(shape_fn, fill, line):
    mask = Image.new("L", (W, W), 0)
    shape_fn(ImageDraw.Draw(mask))
    dil = mask.filter(ImageFilter.MaxFilter(sc(5) * 2 + 1))
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    img = Image.composite(Image.new("RGBA", (W, W), line + (255,)), img, dil)
    img = Image.composite(Image.new("RGBA", (W, W), fill + (255,)), img, mask)
    return img.resize((OUT_PX, OUT_PX), Image.LANCZOS)


def main():
    pieces = {}
    for t, fn in SHAPES.items():
        pieces["w" + t] = render(fn, WHITE_FILL, WHITE_LINE)
        pieces["b" + t] = render(fn, BLACK_FILL, BLACK_LINE)
        pieces["w" + t].save(os.path.join(OUT, "w" + t + ".png"))
        pieces["b" + t].save(os.path.join(OUT, "b" + t + ".png"))

    # contactvel om te bekijken: 6 stukken breed, 4 rijen (w op licht/donker, b op licht/donker)
    order = ["p", "r", "n", "b", "q", "k"]
    cell = 100
    sheet = Image.new("RGB", (cell * 6, cell * 4), (255, 255, 255))
    rows = [("w", SQ_LIGHT), ("w", SQ_DARK), ("b", SQ_LIGHT), ("b", SQ_DARK)]
    for ri, (col, sqcol) in enumerate(rows):
        for ci, t in enumerate(order):
            tile = Image.new("RGB", (cell, cell), sqcol)
            p = pieces[col + t].resize((90, 90), Image.LANCZOS)
            tile.paste(p, (5, 5), p)
            sheet.paste(tile, (ci * cell, ri * cell))
    sheet.save(os.path.join(OUT, "_preview.png"))
    print("Klaar:", len(pieces), "stukken +", "_preview.png")


if __name__ == "__main__":
    main()
