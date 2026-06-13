# -*- coding: utf-8 -*-
"""
Neemt alle vaste zinnen van de app vooraf op met neurale Nederlandse stemmen
(Microsoft Edge TTS, gratis, geen account/sleutel). Elke stem komt in een
eigen map onder audio/<id>/ met een eigen manifest.json. audio/voices.json
houdt bij welke stemmen er zijn (de ouder kan kiezen in de instellingen).

Gebruik:  python tools/make_voice.py
"""
import os, re, json, asyncio, glob
import edge_tts

# Beschikbare stemmen. De eerste is de standaard.
VOICES = [
    {"id": "fenna",   "voice": "nl-NL-FennaNeural",   "rate": "-8%", "pitch": "+18Hz", "naam": "Meisjesstem (Fenna)"},
    {"id": "maarten", "voice": "nl-NL-MaartenNeural", "rate": "-6%", "pitch": "+6Hz",  "naam": "Jongensstem (Maarten)"},
]

HERE = os.path.dirname(__file__)
AUDIO = os.path.join(HERE, "..", "audio")
os.makedirs(AUDIO, exist_ok=True)

PRAISE = ["Hoera!", "Wauw, knap!", "Helemaal goed!", "Top gedaan!", "Jaaa!", "Wat goed van jou!", "Super gedaan!", "Petje af!"]
TRY_AGAIN = [
    "Bijna! Probeer het nog eens, je kan het!",
    "Oei, net niet. Nog een keertje!",
    "Geeft niks! Probeer maar opnieuw.",
    "Nog een poging, jij kan dit!",
]

PHRASES = [
    # module 1: het bord
    "Zullen we beginnen? Kijk eens, dit is het schaakbord.",
    "Het heeft een heleboel vakjes. Sommige zijn licht, en sommige zijn donker.",
    "Zie je dat ze om en om staan? Een beetje als een dambord.",
    "Op dit bord spelen twee legers tegen elkaar: de witte stukken en de zwarte stukken.",
    "Tik maar eens op een vakje. Kijk wat er gebeurt!",
    "Ja, die lichtte op! Nog eentje.", "Leuk hè? Probeer er nog een.", "Hihi, jij snapt het al. Nog een keer!",
    "Goed zo! Je hebt het hele bord ontdekt.",
    "Klaar om de stukken te leren kennen? Daar gaan we!",
    # module 2: de stukken
    "We gaan de stukken leren kennen. Elk stuk loopt op zijn eigen manier. Eentje tegelijk, rustig aan.",
    "Dit is de toren. Hij rijdt kaarsrecht, zoals een trein op de rails: naar voren, naar achteren, of opzij. Zo ver als hij wil, maar nooit schuin. De toren is een sterk stuk.",
    "Dit is de loper. Hij glijdt altijd schuin, net een schaatser op het ijs. Zo ver als hij wil, maar alleen schuin. Let op: een loper blijft altijd op dezelfde kleur vakjes.",
    "Dit is het paard. Dat ben ik! Ik spring in de vorm van een letter L: twee stapjes vooruit en dan eentje opzij. Hop! En het allerleukste: ik mag over andere stukken heen springen. Dat kan niemand anders.",
    "Dit is de dame. Zij is het allersterkste stuk! Zij mag rechtdoor én schuin, alle kanten op, zo ver als ze wil. Pas dus goed op je dame, je wilt haar niet kwijtraken.",
    "Dit is de koning. Hij is de baas van het spel, maar wel een beetje langzaam: hij zet steeds maar één klein stapje, in elke richting. De koning is het belangrijkste stuk, hem moet je goed beschermen.",
    "Dit is de pion, het kleinste soldaatje. Hij stapt vooruit, eentje tegelijk. De allereerste keer mag hij twee stapjes. Hij gaat nooit achteruit. En weet je wat knap is? Komt een pion helemaal aan de overkant, dan wordt hij een dame!",
    "Tik op het stuk. De groene stipjes laten zien waar hij naartoe mag.",
    "Verzamel nu de sterretjes! Pak ze één voor één.",
    "Eén ster!", "Twee sterren!", "Drie sterren!", "Vier sterren!",
    "Wauw, je kent nu alle stukken en hoe ze lopen! Wat heb jij dat snel geleerd.",
    # module 3: slaan
    "Nu leren we slaan: stukken van de tegenstander pakken.",
    "Soms staat er een stuk van de tegenstander in de weg. Weet je wat je dan mag doen? Het pakken! Dat heet slaan. Je zet jouw stuk op het vakje van het andere stuk.",
    "Pak het zwarte stuk met je toren. Tik op je toren, en dan op het zwarte stuk.",
    "Ook de loper kan slaan. Hij pakt schuin, want zo loopt hij ook.",
    "Pak het zwarte paard met je loper!",
    "En nu de pion. Let goed op: de pion stapt rechtdoor, maar slaan doet hij schuin!",
    "Pak het zwarte stuk schuin met je pion!",
    "Hebbes! Lekker geslagen!", "Boem! Mooi gepakt!", "Ja! Dat ging knap!",
    "Knap! Maar pas op: de tegenstander mag jouw stukken ook slaan. Bescherm ze dus goed.",
    "Slaan kun je nu ook. Je wordt steeds beter, zeg!",
    # module 4: schaak en mat
    "Nu komt het belangrijkste van schaken. Want waarom spelen we eigenlijk?",
    "Het doel van het hele spel is om de koning van de ander te vangen. Dat heet schaakmat, en dan win je!",
    "Kijk, ik val de zwarte koning aan met mijn dame.",
    "Wordt een koning aangevallen? Dan heet dat schaak. De koning moet dan snel veilig worden.",
    "En kan de koning helemaal niet meer ontsnappen? Dan is het schaakmat. Het spel is uit, en jij hebt gewonnen!",
    "Nu jij! Kun jij de zwarte koning schaakmat zetten, in één zetje?",
    "Tik op je toren en zet hem helemaal naar boven, vlak naast de koning.",
    "Schaakmat! Je hebt het voor elkaar! Hoeraaa!",
    "Een tipje: schuif je toren helemaal naar boven, naar het bovenste rijtje.",
    # module 5: een partijtje
    "Nu gaan we een echt partijtje spelen! Jij speelt met de witte stukken, ik met de zwarte.",
    "Onthoud: jij wint als je mijn koning schaakmat zet. En pas ondertussen goed op je eigen koning!",
    "Jij mag beginnen, want wit zet altijd als eerste. Heb je hulp nodig? Tik dan op de lamp. Veel plezier!",
    "Lekker geslagen!", "Hebbes!", "Goed gepakt!",
    "Mooie zet!", "Goed bezig, ga zo door!", "Jij kan dit echt goed!",
    "Pas op! Je koning staat schaak. Hij wordt aangevallen.",
    "Zal ik je een tip geven? Zet dit stuk eens naar het vakje dat oplicht.",
    "Schaakmat! Jij hebt gewonnen! Wat ben jij een kampioen!",
    "Oei, ik had even mazzel! Maar wat speelde jij goed, zeg.",
    "Wat een leuk partijtje was dat! Jij bent een echte schaker aan het worden.",
    # app: menu, einde, instellingen
    "Hoi! Ik ben Hinnik, het schaakpaardje. Wat leuk dat je er bent! Kies maar een plaatje, dan gaan we samen schaken leren.",
    "Wat wil je nu doen? Kies maar een plaatje!",
    "Tik op het groene pijltje voor het volgende spelletje. Of op de oranje knop om dit nog eens te doen.",
    "Je hebt alles gedaan! Wat knap, zeg! Tik op het huisje om terug te gaan.",
    "Het geluid staat weer aan!",
    "Hoi! Ik ben Hinnik het paardje. Zullen we samen leren schaken?",
    "Zo klinkt de stem van het toestel.",
    "Zo klink ik nu.",
    "Klaar! We kunnen weer helemaal opnieuw beginnen.",
]
for p in PRAISE:
    PHRASES.append(p + " Je hebt alle sterretjes!")
PHRASES.extend(TRY_AGAIN)


def norm(s):
    return " ".join(s.split()).lower()


def slug(s):
    base = re.sub(r"[^a-z0-9]+", "-", norm(s))[:32].strip("-")
    return base or "zin"


async def gen_one(outdir, voicecfg, idx, text, manifest):
    fname = f"{idx:03d}-{slug(text)}.mp3"
    path = os.path.join(outdir, fname)
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voicecfg["voice"], rate=voicecfg["rate"], pitch=voicecfg["pitch"]).save(path)
            if os.path.getsize(path) > 500:
                manifest[norm(text)] = fname
                return True
        except Exception as e:
            if attempt == 2:
                print("  ! mislukt:", text[:36], "->", e)
            await asyncio.sleep(1.0)
    return False


async def gen_voice(voicecfg, items):
    outdir = os.path.join(AUDIO, voicecfg["id"])
    os.makedirs(outdir, exist_ok=True)
    # oude mp3's in deze map opruimen
    for old in glob.glob(os.path.join(outdir, "*.mp3")):
        os.remove(old)
    manifest = {}
    print(f"\nStem '{voicecfg['id']}' ({voicecfg['voice']}, {voicecfg['rate']}, {voicecfg['pitch']}): {len(items)} zinnen")
    batch = 6
    for i in range(0, len(items), batch):
        chunk = items[i:i + batch]
        await asyncio.gather(*[gen_one(outdir, voicecfg, i + j, t, manifest) for j, t in enumerate(chunk)])
        print(f"  {min(i + batch, len(items))}/{len(items)}")
    with open(os.path.join(outdir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=0)
    return len(manifest)


async def main():
    seen, items = set(), []
    for text in PHRASES:
        k = norm(text)
        if k not in seen:
            seen.add(k)
            items.append(text)

    # oude losse mp3's in de root van audio/ opruimen (oude opzet met één stem)
    for old in glob.glob(os.path.join(AUDIO, "*.mp3")):
        os.remove(old)
    old_manifest = os.path.join(AUDIO, "manifest.json")
    if os.path.exists(old_manifest):
        os.remove(old_manifest)

    for v in VOICES:
        n = await gen_voice(v, items)
        print(f"  -> {n} bestanden in audio/{v['id']}/")

    voices_index = [{"id": v["id"], "naam": v["naam"], "dir": v["id"]} for v in VOICES]
    with open(os.path.join(AUDIO, "voices.json"), "w", encoding="utf-8") as f:
        json.dump(voices_index, f, ensure_ascii=False, indent=2)
    print(f"\nKlaar. {len(VOICES)} stemmen, {len(items)} zinnen elk. audio/voices.json geschreven.")


if __name__ == "__main__":
    asyncio.run(main())
