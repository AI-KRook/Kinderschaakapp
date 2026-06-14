# -*- coding: utf-8 -*-
"""Controleert of alle gesproken zinnen in de app ook in make_voice.py staan."""
import os, re, sys
HERE = os.path.dirname(__file__)
sys.path.insert(0, HERE)
import make_voice as mv

recorded = set(mv.norm(mv.pronounce(p)) for p in mv.PHRASES)
# de samengestelde lof-zinnen (pick(PRAISE) + suffix) staan al via de loop in PHRASES

def read(name):
    with open(os.path.join(HERE, "..", "js", name), encoding="utf-8") as f:
        return f.read()

src = read("modules.js") + "\n" + read("app.js") + "\n" + read("board.js")

# alle dubbele-aanhalingstekst-strings
strings = re.findall(r'"((?:[^"\\]|\\.)*)"', src)

# strings die wél als tekst voorkomen maar NIET door Hinnik worden ingesproken:
# - menukaart-titels (staan in beeld, niet gesproken)
# - bewuste toestel-stem-previews (moeten juist de toestel-stem laten horen)
NIET_GESPROKEN = {
    "Het bord", "De stukken", "Slaan", "Schaak en mat", "Puzzels", "De opening", "Het eindspel", "Een partijtje",
    "Hoi! Zo klink ik.",
}

def looks_spoken(s):
    if "<" in s or "http" in s:
        return False
    if "/" in s:               # FEN-strings (bv. 4k3/8/8/...) zijn geen zinnen
        return False
    if not re.search(r"[a-zà-ÿ]", s):
        return False
    if " " not in s:
        return False
    # codeachtige strings uitsluiten
    if re.fullmatch(r"[a-z0-9 \-]+", s) and not re.search(r"[.!?]", s):
        # bv. "big-action sun hint-btn" -> geen zin
        return False
    return True

missing = []
for s in strings:
    if not looks_spoken(s):
        continue
    if s in NIET_GESPROKEN or s in mv.PRAISE:   # losse lof-woorden alleen samengesteld gebruikt
        continue
    if mv.norm(mv.pronounce(s)) not in recorded:
        missing.append(s)

# de losse suffix "  Je hebt alle sterretjes!" zit alleen in samengestelde vorm
missing = [m for m in missing if mv.norm(m) != mv.norm("Je hebt alle sterretjes!")]

if missing:
    print("NIET OPGENOMEN (vallen terug op toestel-stem):")
    for m in sorted(set(missing)):
        print("  -", m)
else:
    print("OK: alle gesproken zinnen staan in make_voice.py")
print("Totaal opgenomen zinnen:", len(recorded))
