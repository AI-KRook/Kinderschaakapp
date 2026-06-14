# -*- coding: utf-8 -*-
"""Tekent vriendelijke, ronde schaakstukken (warme stijl) als PNG's:
6 soorten x 2 kleuren. Elk stuk heeft zijn klassieke, herkenbare kenmerk
(toren = kantelen, loper = mijter met sneetje, dame = pareltjes-kroon,
koning = kruis), zodat ze voor een kind duidelijk van elkaar verschillen.

Een nette omlijning komt via uitdijen (dilatie) van de silhouet-mask, zodat
er geen lelijke binnenlijnen ontstaan. Fijne, donkere detaillijntjes (zoals
het loper-sneetje of het oog van het paard) worden gemaakt door een dun
gaatje (fill=0) in de mask te knippen: de dilatie sluit het gat voor de
buitenrand, maar in de vulling blijft het als donkere groef zichtbaar.

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
OUTLINE = 4      # dikte van de buitenrand (logische px)


def sc(v): return int(round(v * S))


# ---- positieve vormen (vullen het silhouet) ----
def E(d, x0, y0, x1, y1): d.ellipse([sc(x0), sc(y0), sc(x1), sc(y1)], fill=255)
def RR(d, x0, y0, x1, y1, r): d.rounded_rectangle([sc(x0), sc(y0), sc(x1), sc(y1)], radius=sc(r), fill=255)
def POLY(d, pts): d.polygon([(sc(x), sc(y)) for x, y in pts], fill=255)

# ---- negatieve vormen (knippen een donkere groef/detail) ----
def CUT_POLY(d, pts): d.polygon([(sc(x), sc(y)) for x, y in pts], fill=0)
def CUT_E(d, x0, y0, x1, y1): d.ellipse([sc(x0), sc(y0), sc(x1), sc(y1)], fill=0)


def pawn(d):
    E(d, 47, 12, 73, 38)                                # kop
    RR(d, 51, 36, 69, 46, 5)                            # halsje
    POLY(d, [(52, 44), (68, 44), (75, 84), (45, 84)])   # slank lijf
    RR(d, 37, 80, 83, 100, 9)                           # voet


def rook(d):
    # kantelen met open ruimte ertussen -> duidelijk een kasteel
    RR(d, 37, 20, 45, 40, 2)
    RR(d, 56, 20, 64, 40, 2)
    RR(d, 75, 20, 83, 40, 2)
    RR(d, 35, 36, 85, 48, 3)                            # borstwering
    POLY(d, [(45, 48), (75, 48), (77, 82), (43, 82)])   # smalle, rechte toren
    RR(d, 35, 80, 85, 100, 9)                           # voet


def bishop(d):
    E(d, 55, 7, 65, 17)                                 # balletje bovenop
    POLY(d, [(60, 12), (51, 45), (69, 45)])             # zachte punt
    E(d, 48, 29, 72, 79)                                # slanke mijter
    RR(d, 51, 75, 69, 84, 4)                            # kraagje
    POLY(d, [(52, 82), (68, 82), (77, 88), (43, 88)])   # overgang
    RR(d, 37, 82, 83, 100, 9)                           # voet
    # het kenmerkende schuine sneetje in de mijter (donkere groef)
    CUT_POLY(d, [(56, 31), (60, 28), (67, 43), (63, 46)])


def queen(d):
    # slank kroontje met vijf pareltjes
    for cx in (43, 51, 60, 69, 77):
        E(d, cx - 5, 10, cx + 5, 20)                    # pareltje
        POLY(d, [(cx - 6, 32), (cx, 20), (cx + 6, 32)]) # punt
    RR(d, 39, 30, 81, 42, 4)                            # kroonband
    POLY(d, [(46, 42), (74, 42), (78, 82), (42, 82)])   # slank lijf
    RR(d, 35, 80, 85, 100, 9)                           # voet


def king(d):
    RR(d, 56, 4, 64, 32, 3)                             # kruis (verticaal)
    RR(d, 50, 12, 70, 21, 3)                            # kruis (horizontaal)
    RR(d, 40, 32, 80, 46, 4)                            # kroonband
    POLY(d, [(46, 46), (74, 46), (80, 82), (40, 82)])   # slank, statig lijf
    RR(d, 33, 80, 87, 100, 9)                           # voet


def knight(d):
    # slank paardenhoofd naar rechts: oren, snuit en een oog
    POLY(d, [
        (45, 82), (43, 60), (47, 46), (44, 34), (50, 41), (54, 35),
        (59, 24), (64, 39), (74, 41), (87, 52), (88, 59), (76, 59),
        (71, 64), (67, 75), (66, 82)
    ])
    RR(d, 36, 80, 84, 100, 9)                           # voet
    CUT_E(d, 67, 46, 74, 53)                            # oog
    CUT_E(d, 81, 54, 86, 59)                            # neusgat


SHAPES = {"p": pawn, "r": rook, "n": knight, "b": bishop, "q": queen, "k": king}


def render(shape_fn, fill, line):
    mask = Image.new("L", (W, W), 0)
    shape_fn(ImageDraw.Draw(mask))
    dil = mask.filter(ImageFilter.MaxFilter(sc(OUTLINE) * 2 + 1))
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
