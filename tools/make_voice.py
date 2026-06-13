# -*- coding: utf-8 -*-
"""
Neemt alle vaste zinnen van de app vooraf op met een neurale Nederlandse stem
(Microsoft Edge TTS, gratis, geen account/sleutel) en zet ze als mp3 in audio/.
Schrijft audio/manifest.json: { "<genormaliseerde tekst>": "<bestandsnaam>" }.

Gebruik:  python tools/make_voice.py
"""
import os, re, json, asyncio
import edge_tts

VOICE = "nl-NL-FennaNeural"
RATE = "-8%"      # iets langzamer: prettiger voor jonge kinderen
PITCH = "+18Hz"   # iets hoger: speels en warm

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "audio")
os.makedirs(OUT, exist_ok=True)

# Praise- en try-again-zinnen
PRAISE = ["Hoera!", "Wauw, knap!", "Helemaal goed!", "Top gedaan!", "Jaaa!", "Wat goed van jou!"]
TRY_AGAIN = [
    "Bijna! Probeer het nog eens, je kan het!",
    "Oei, net niet. Nog een keertje!",
    "Geeft niks! Probeer maar opnieuw.",
    "Nog een poging, jij kan dit!",
]

PHRASES = [
    # --- module 1: het bord ---
    "Hoi! Ik ben Hinnik, het schaakpaardje. Leuk dat je er bent!",
    "Kijk eens. Dit is een schaakbord.",
    "Het heeft heel veel vakjes. Lichte en donkere.",
    "Tik maar eens op een vakje. Kijk wat er gebeurt!",
    "Ja! Nog eentje.", "Leuk hè? Nog een vakje!", "Hihi, nog een keer!",
    "Wat goed! Je hebt het bord ontdekt.",
    "Op dit bord gaan we straks schaken. Nu leren we eerst de stukken!",
    # --- module 2: de stukken ---
    "Nu gaan we de stukken leren. Eentje voor eentje.",
    "Dit is de toren. Hij rijdt rechtdoor. Naar boven, naar onder, of opzij. Net als een trein op de rails!",
    "Dit is de loper. Hij glijdt altijd schuin. Net als een schaatser op het ijs!",
    "Dit is het paard. Dat ben ik! Ik spring in een letter L. Twee vooruit en dan een stapje opzij. Hop! Ik mag zelfs over andere stukken springen.",
    "Dit is de dame. Zij is de sterkste! Zij mag rechtdoor en schuin. Alle kanten op!",
    "Dit is de koning. Hij is de baas, maar wel een beetje langzaam. Hij zet maar één klein stapje.",
    "Dit is de pion, het kleinste soldaatje. Hij loopt vooruit. De allereerste keer mag hij twee stapjes. Nooit achteruit!",
    "Tik op het stuk. De groene stipjes laten zien waar hij heen mag.",
    "Kun jij het sterretje pakken?",
    "Knap hoor! Je kent nu alle stukken van het schaakspel!",
    # --- module 3: slaan ---
    "Soms staat er een stuk van de tegenstander in de weg. Dan mag je het pakken! Dat heet slaan.",
    "Sla het zwarte stuk met je toren. Tik op je toren en dan op het zwarte stuk.",
    "Nu de loper. Hij slaat schuin, want zo loopt hij ook.",
    "Sla het zwarte paard met je loper!",
    "En nu de pion. Let op! De pion loopt rechtdoor, maar hij slaat alleen schuin.",
    "Sla het zwarte stuk schuin met je pion!",
    "Hebbes! Je hebt hem geslagen!", "Boem! Geslagen! Knap!", "Ja! Mooi geslagen!",
    "Slaan kun je nu ook! Je wordt al een echte schaker.",
    # --- module 4: schaak en mat ---
    "Nu leren we iets belangrijks: schaak.",
    "Kijk, ik val de zwarte koning aan met de dame.",
    "Als de koning wordt aangevallen, heet dat schaak! De koning moet dan oppassen.",
    "En als de koning niet meer kan ontsnappen, dan is het schaakmat. Dan heb je gewonnen!",
    "Nu jij! Kun jij de zwarte koning schaakmat zetten? In één zet!",
    "Tik op je toren en zet hem helemaal naar boven, naast de koning.",
    "Schaakmat! Je hebt gewonnen! Hoeraaa!",
    "Een tip: zet je toren helemaal naar boven, op het bovenste rijtje.",
    # --- module 5: een partijtje ---
    "Nu spelen we een echt partijtje! Jij bent wit.",
    "Ik speel met de zwarte stukken. Jij mag beginnen!",
    "Tik op een stuk en zet hem op een groene stip.",
    "Lekker geslagen!", "Hebbes!", "Goeie!",
    "Mooie zet!", "Goed bezig!", "Je doet het knap!",
    "Pas op, schaak! Je koning wordt aangevallen.",
    "Schaakmat! Jij hebt gewonnen! Wat een kampioen!",
    "Ik had even geluk! Maar jij speelde supergoed. Top!",
    "Wat een mooi partijtje! Jij bent een echte schaker!",
    # --- app: menu, einde, instellingen ---
    "Tik op het groene pijltje voor het volgende spel. Of op de oranje knop om dit nog eens te doen.",
    "Je hebt alles gedaan! Wat knap! Tik op het huisje om terug te gaan.",
    "Kies maar wat je wilt leren!",
    "Het geluid staat weer aan!",
    "Hoi! Ik ben Hinnik. Wat leuk dat je er bent! Kies maar een plaatje om te leren.",
    "Hoi! Ik ben Hinnik het paardje. Zullen we samen leren schaken?",
    "Zo klink ik nu.",
    "Klaar! We kunnen weer helemaal opnieuw beginnen.",
]

# samengestelde zinnen (zoals ze in de app klinken)
for p in PRAISE:
    PHRASES.append(p + " Je hebt het sterretje!")
PHRASES.extend(TRY_AGAIN)


def norm(s):
    return " ".join(s.split()).lower()


def slug(s):
    base = re.sub(r"[^a-z0-9]+", "-", norm(s))[:32].strip("-")
    return base or "zin"


async def gen_one(idx, text, manifest):
    fname = f"{idx:03d}-{slug(text)}.mp3"
    path = os.path.join(OUT, fname)
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(path)
            if os.path.getsize(path) > 500:
                manifest[norm(text)] = fname
                return True
        except Exception as e:
            if attempt == 2:
                print("  ! mislukt:", text[:40], "->", e)
            await asyncio.sleep(1.0)
    return False


async def main():
    # dedup op genormaliseerde tekst, maar bewaar de originele tekst voor de uitspraak
    seen, items = set(), []
    for text in PHRASES:
        k = norm(text)
        if k not in seen:
            seen.add(k)
            items.append(text)

    manifest = {}
    print(f"Opnemen van {len(items)} zinnen met {VOICE} ({RATE}, {PITCH})...")
    # in kleine groepjes voor snelheid
    batch = 6
    for i in range(0, len(items), batch):
        chunk = items[i:i + batch]
        await asyncio.gather(*[gen_one(i + j, t, manifest) for j, t in enumerate(chunk)])
        print(f"  {min(i + batch, len(items))}/{len(items)}")

    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=0)
    print(f"Klaar: {len(manifest)} mp3-bestanden in audio/ + manifest.json")


if __name__ == "__main__":
    asyncio.run(main())
