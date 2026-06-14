# -*- coding: utf-8 -*-
"""
Neemt alle vaste zinnen van de app vooraf op met neurale Nederlandse stemmen
(Microsoft Edge TTS, gratis, geen account/sleutel). Elke stem komt in een
eigen map onder audio/<id>/ met een eigen manifest.json. audio/voices.json
houdt bij welke stemmen er zijn.

De zinnen zijn met korte stukken en komma's geschreven, zodat de stem
natuurlijk pauzeert. (Losse klemtoontekens zoals "rechtdóór" worden door
deze stem genegeerd; alleen woord-accenten als "één" werken.)

Gebruik:  python tools/make_voice.py
"""
import os, re, json, asyncio, glob
import edge_tts

VOICES = [
    {"id": "fenna",   "voice": "nl-NL-FennaNeural",   "rate": "-8%", "pitch": "+18Hz", "naam": "Fenna (meisje)"},
    {"id": "maarten", "voice": "nl-NL-MaartenNeural", "rate": "-6%", "pitch": "+6Hz",  "naam": "Maarten (jongen)"},
]

HERE = os.path.dirname(__file__)
AUDIO = os.path.join(HERE, "..", "audio")
os.makedirs(AUDIO, exist_ok=True)

PRAISE = ["Hoera!", "Wauw, knap!", "Helemaal goed!", "Top gedaan!", "Jaaa!", "Wat goed van jou!", "Super gedaan!", "Petje af!"]
TRY_AGAIN = [
    "Bijna! Kijk waar het handje wijst.",
    "Oei, net niet. Volg het handje maar.",
    "Nog een keertje! Het handje wijst de weg.",
    "Probeer het nog eens, naar het vakje met het handje.",
]
# gerichte foutfeedback per stuk (module 2)
PIECE_MIS = [
    "De toren gaat rechtdoor. Schuif hem naar de ster!",
    "De loper gaat schuin. Schuif hem naar de ster!",
    "Het paard springt in een L. Spring naar de ster!",
    "De dame mag alle kanten op. Ga naar de ster!",
    "De koning zet één stapje. Ga naar de ster!",
    "De pion stapt vooruit. Ga naar de ster!",
]

PHRASES = [
    # module 1: het bord
    "Zullen we beginnen? Kijk, dit is het schaakbord.",
    "Het heeft heel veel vakjes. Sommige zijn licht, en sommige zijn donker.",
    "Zie je dat ze om en om staan? Net een dambord.",
    "Op dit bord spelen twee legers tegen elkaar. De witte stukken, en de zwarte stukken.",
    "Tik maar eens op een vakje. Kijk wat er gebeurt!",
    "Ja, die lichtte op! Nog eentje.", "Leuk hè? Probeer er nog een.", "Hihi, jij snapt het al. Nog een keer!",
    "Goed zo! Je hebt het hele bord ontdekt.",
    "Klaar om de stukken te leren kennen? Daar gaan we!",
    # module 2: de stukken
    "We gaan de stukken leren kennen. Elk stuk loopt op zijn eigen manier. Rustig aan, eentje tegelijk.",
    "Dit is de toren. Hij gaat rechtdoor: vooruit, achteruit of opzij. Maar nooit schuin.",
    "Dit is de loper. Hij gaat altijd schuin, en blijft op zijn eigen kleur.",
    "Dit is het paard, dat ben ik! Ik spring in een L, en mag over andere stukken heen.",
    "Dit is de dame, het sterkste stuk. Zij mag alle kanten op, recht en schuin.",
    "Dit is de koning, de baas. Hij zet maar één stapje tegelijk. Pas goed op hem!",
    "Dit is de pion. Hij stapt vooruit, eentje tegelijk. Aan de overkant wordt hij een dame!",
    "Tik op het stuk. De groene stipjes laten zien waar hij naartoe mag.",
    "Verzamel nu de sterretjes! Pak ze één voor één.",
    "Eén ster!", "Twee sterren!", "Drie sterren!", "Vier sterren!",
    "Wauw! Je kent nu alle stukken, en hoe ze lopen. Wat heb jij dat snel geleerd.",
    # module 3: slaan
    "Nu leren we slaan. Dat is: stukken van de tegenstander pakken.",
    "Je slaat een stuk op de manier waarop dat stuk zelf loopt. Je zet jouw stuk op de plek van het andere.",
    "Soms staat er een stuk van de tegenstander in de weg. Weet je wat je dan mag doen? Het pakken! Dat heet slaan. Je zet jouw stuk op zijn plek.",
    "Pak het zwarte stuk met je toren. Tik op je toren, en dan op het zwarte stuk.",
    "Ook de loper kan slaan. Hij pakt schuin, want zo loopt hij ook.",
    "Pak het zwarte paard met je loper!",
    "En nu de pion. Let goed op! De pion stapt rechtdoor, maar slaan doet hij schuin.",
    "Pak het zwarte stuk schuin met je pion!",
    "Hebbes! Lekker geslagen!", "Boem! Mooi gepakt!", "Ja! Dat ging knap!",
    # en passant
    "Nu komt een hele bijzondere! Het heet en passant. Dat is Frans voor: in het voorbijgaan.",
    "Kijk goed. Mijn zwarte pion rent met twee stappen langs jouw pion. Hij denkt: lekker, jij kan mij niet pakken!",
    "Maar dat mag jij juist wel! Jouw pion slaat hem schuin, alsof hij maar een stapje had gedaan.",
    "Sla mijn pion en passant! Tik op jouw pion, en dan op het schuine vakje erachter.",
    "Knap! Maar let op: de tegenstander mag jouw stukken ook slaan. Bescherm ze dus goed.",
    "Slaan kun je nu ook, en zelfs en passant! Je wordt steeds beter, zeg!",
    # module 4: schaak, mat en rokeren
    "Nu komt het belangrijkste van schaken. Want waarom spelen we eigenlijk?",
    "Het doel van het hele spel is: de koning van de ander vangen. Dat heet schaakmat. En dan win je!",
    "Kijk, ik val de zwarte koning aan met mijn dame.",
    "Wordt een koning aangevallen? Dan heet dat schaak. De koning moet dan snel veilig worden.",
    "Sta je schaak? Dan kan je drie dingen doen om je koning te redden.",
    "Eén: loop met je koning weg, naar een veilig vakje.",
    "Twee: zet een ander stuk ervoor, als een schildje.",
    "Drie: sla het stuk dat jouw koning aanvalt.",
    "En kan de koning helemaal niet meer ontsnappen? Dan is het schaakmat. Het spel is uit!",
    # zelf schaak geven
    "Nu jij! Geef de zwarte koning eens schaak. Jaag hem op met je toren.",
    "Schaak! Heel knap! De koning wordt nu aangevallen.",
    "Dit was nog geen mat, want de koning kon nog weglopen. Maar goed gedaan, hoor!",
    # rokeren
    "Nu een slimme truc om je koning veilig te zetten. Het heet rokeren.",
    "De koning en de toren bewegen samen. De koning springt twee vakjes opzij, de toren komt ernaast.",
    "Zo zit je koning lekker veilig in een hoekje, met de toren ervoor.",
    "Doe de korte rokade. Tik op de koning, en zet hem twee vakjes naar rechts.",
    "Knap! Je koning staat nu veilig in het hoekje.",
    "En nu de lange rokade. Tik op de koning, en zet hem twee vakjes naar links.",
    "Allebei gelukt! Nu ken je de korte en de lange rokade.",
    "Maar let op, rokeren mag niet altijd!",
    "Zie je die zwarte toren? De koning zou er vlak langs lopen. Door gevaar rokeren mag niet.",
    # mat-in-één oefenen
    "Nu gaan we matzetten oefenen. Klaar voor de eerste?",
    "Zet de zwarte koning schaakmat! Schuif je toren naar boven, vlak naast de koning.",
    "Een tipje: schuif je toren helemaal naar boven. Naar het bovenste rijtje.",
    "Pak je dame, en zet hem vlak naast de zwarte koning. Jouw koning past goed op de dame.",
    "Een tipje: zet je dame vlak naast de zwarte koning.",
    "Nog eentje! Zet je dame helemaal naar boven, op het rijtje van de koning.",
    "Een tipje: schuif je dame naar boven, naar het rijtje van de koning.",
    "Schaakmat! Je hebt het voor elkaar! Hoeraaa!",
    "Wauw! Je weet nu wat schaak is, en schaakmat, en je kan zelfs rokeren. Wat ben jij knap!",
    "En soms kan niemand winnen. Dan is het gelijkspel, niemand verliest.",
    # module: puzzels (tactiek) - zes verschillende motieven
    "Welkom bij de puzzels! Hier word jij een echte schaakbaas. Klaar?",
    "Pak de zwarte dame! Ze staat helemaal alleen, niemand verdedigt haar.",
    "Tik op je toren en pak de dame die oplicht.",
    "Breng je pion naar de overkant. Dan wordt hij een dame!",
    "Tik op je pion en zet hem helemaal naar boven.",
    "Joepie! Je pion is een dame geworden!",
    "Nu de vork! Eén stuk dat er twee tegelijk aanvalt. Heel slim.",
    "Zet je paard op het vakje dat oplicht. Dan val je de koning en de dame samen aan!",
    "Zet je paard op het paarse vakje.",
    "Ook een pion kan vorken! Zet je pion vooruit, op het vakje dat oplicht. Hij valt dan twee paarden tegelijk aan.",
    "Zet je pion een stapje vooruit, op het paarse vakje.",
    "Een vork! Allebei tegelijk! Wat ben jij slim.",
    "Nu wat moeilijkere trucs! Goed opletten.",
    "Het zwarte paard zit vast voor de koning, het mag niet weg. Pak het met je pion!",
    "Tik op je pion en sla het paard schuin.",
    "Knap! Het paard zat vast en jij pakte het.",
    "Een toverzet! Haal je paard weg, en de toren erachter geeft schaak. Pak meteen de dame!",
    "Zet je paard op de dame. Dan geeft de toren erachter schaak.",
    "Aftrekschaak! De toren geeft schaak en jij wint de dame. Super slim!",
    "Een spies! Val de koning aan met je toren. Hij moet opzij, en dan pak jij de dame erachter.",
    "Zet je toren op het paarse vakje, onder de koning.",
    "Een spies! Eerst de koning, dan de dame. Wat ben jij slim!",
    "En nu het mooiste: zet mat in één!",
    "De laatste! Zet je dame vlak naast de koning. Jouw koning past op haar.",
    "Een tipje: schuif je toren helemaal naar boven, naast de koning.",
    "Een tipje: zet je dame naast de zwarte koning, op de bovenste rij.",
    "Wauw! Jij bent een echte puzzelkampioen. Knap hoor!",
    # module: de opening
    "Hoe begin je een potje goed? Ik leer je drie slimme regels!",
    "Regel één: zet een pion in het midden. Schuif je pion twee vakjes vooruit.",
    "Regel twee: haal je paard naar buiten, klaar om te springen.",
    "Ook je loper mag naar buiten. Geef hem de ruimte.",
    "En nu het belangrijkste: zet je koning veilig. Rokeer!",
    "Knap! Je pion staat in het midden, je stukken zijn klaar, en je koning is veilig. Zo begin je als een kampioen!",
    # module: het eindspel
    "Welkom bij het eindspel! Nu zijn er nog maar weinig stukken over. Jij moet de koning van de ander matzetten.",
    "De truc: jaag de koning naar de rand, en zet hem dan mat. Je eigen koning helpt mee.",
    "Zet de zwarte koning mat met je dame. Schuif haar naar de bovenste rij.",
    "Een tipje: zet je dame helemaal naar boven, op het rijtje van de koning.",
    "Schaakmat! Je dame en je koning werkten samen. Knap!",
    "En nu met de toren! Schuif hem naar de bovenste rij, naast de koning.",
    "Een tipje: zet je toren helemaal naar boven.",
    "Schaakmat met de toren! Super!",
    "Nog eentje. Zet je dame vlak naast de koning. Jouw koning past op haar.",
    "Een tipje: zet je dame naast de zwarte koning.",
    "Schaakmat! Vlak naast de koning. Wat ben jij sterk!",
    "Knap! Jij kan nu de koning matzetten. Zo win je een potje!",
    # vernieuwde tactiek-puzzels (met de naam van de truc)
    "De vork! Zet je paard op het vakje dat oplicht. Dan val je de koning en de dame samen aan.",
    "De penning! Het zwarte paard zit vast voor de koning, het mag niet weg. Pak het met je pion!",
    "De spies! Val de koning aan met je toren. Hij moet opzij, en dan pak jij de dame erachter.",
    "Het aftrekschaak! Haal je paard weg, en de toren erachter geeft schaak. Pak meteen de dame!",
    # vernieuwd eindspel (oppositie en koningstechniek, geen mat)
    "Welkom bij het eindspel! Er staan nog maar weinig stukken. Nu komt het op je koning aan.",
    "Eerst de oppositie. Zet je koning recht tegenover de zwarte koning, met één vakje ertussen. Dan moet hij wijken.",
    "Knap! Nu heb jij de oppositie. Kijk, de zwarte koning moet opzij.",
    "In het eindspel is je koning juist sterk. Loop er dapper mee naar voren!",
    "Goed zo! Een sterke koning helpt je winnen.",
    "En nu het mooiste: breng de pion naar de overkant. Je koning beschermt hem.",
    "De pion is een dame geworden! Zo win je een eindspel.",
    "Knap! Je weet nu hoe je het eindspel speelt: met je koning en de oppositie.",
    # module 5: een partijtje
    "Met welke stukken wil je spelen? Wit of zwart?",
    "Nu gaan we een echt partijtje spelen! Jij speelt met de witte stukken, ik met de zwarte.",
    "Nu gaan we een echt partijtje spelen! Jij speelt met de zwarte stukken, ik met de witte.",
    "Onthoud: jij wint als je mijn koning schaakmat zet. En pas goed op je eigen koning!",
    "Jij mag beginnen, want wit zet altijd als eerste. Heb je hulp nodig? Tik dan op de lamp. Veel plezier!",
    "Ik begin, want wit mag altijd eerst. Daarna ben jij. Heb je hulp nodig? Tik dan op de lamp. Veel plezier!",
    "Lekker geslagen!", "Hebbes!", "Goed gepakt!",
    "Mooie zet!", "Goed bezig, ga zo door!", "Jij kan dit echt goed!",
    "Pas op! Je koning staat schaak. Hij wordt aangevallen.",
    "Zal ik je een tip geven? Zet dit stuk eens naar het vakje dat oplicht.",
    "Schaakmat! Jij hebt gewonnen! Wat ben jij een kampioen!",
    "Oei, ik had even mazzel! Maar wat speelde jij goed, zeg.",
    "Wat een leuk partijtje! Jij bent een echte schaker aan het worden.",
    "Patstelling! De koning kan niet meer, maar staat niet schaak. Het is gelijkspel.",
    "Het is gelijkspel! Niemand wint. Knap gespeeld, hoor!",
    "Je pion is aan de overkant! Kies welk stuk hij wordt.",
    # app: menu, einde, instellingen
    "Hoi! Ik ben Hinnik, het schaakpaardje. Wat leuk dat je er bent! Kies maar een plaatje. Dan gaan we samen schaken leren.",
    "Wat wil je nu doen? Kies maar een plaatje!",
    "Tik op het groene pijltje voor het volgende spelletje. Of op de oranje knop om dit nog eens te doen.",
    "Je hebt alles gedaan! Wat knap, zeg! Tik op het huisje om terug te gaan.",
    "Het geluid staat weer aan!",
    "Hoi! Ik ben Hinnik het paardje. Zullen we samen leren schaken?",
    "Zo klinkt de stem van het toestel.",
    "Zo klink ik nu.",
    "Klaar! We kunnen weer helemaal opnieuw beginnen.",
    # verkleedkast
    "Kijk eens, wat zie ik er mooi uit!",
    "Spaar nog meer sterren, dan mag je deze op!",
    "Hoera! Je hebt iets nieuws verdiend voor de verkleedkast!",
    # uitbreiding module 1: het bord (rijen, lijnen, diagonalen)
    "Kijk, de vakjes liggen in rijtjes naast elkaar. Zo'n rijtje van links naar rechts heet een rij.",
    "En van jou naar de overkant lopen de lijnen, recht vooruit.",
    "Gaat het schuin? Dan heet het een diagonaal. Daar houdt de loper van!",
    "Tik nu eens op een hoekje van het bord, helemaal in de hoek.",
    "Bijna! Een hoekje zit helemaal in de hoek.",
    "Net niet, zoek een hoekje van het bord.",
    "Knap gevonden! Dat was een hoekje van het bord.",
    # module: slim slaan (stukwaarden + slim slaan)
    "Voordat je slim leert slaan, moet je weten hoe sterk elk stuk is. Elk stuk is punten waard.",
    "De pion is het zwakste. Hij is één punt waard.",
    "Het paard is drie punten waard.",
    "De loper ook, drie punten.",
    "De toren is sterker. Vijf punten.",
    "En de dame is de sterkste van allemaal. Negen punten!",
    "Dat is de dame! Negen punten, de sterkste van het bord.",
    "Ja! De toren, vijf punten.",
    "Bijna! Kijk nog eens goed naar de stukken.",
    "Tik nu op het sterkste stuk. Welke is dat?",
    "En tik nu op het stuk dat vijf punten waard is.",
    "Nu ga je slim slaan! Pak stukken die je gratis kunt krijgen, en altijd de sterkste.",
    "Slaan met het paard! Het paard springt in een L, en zo pakt hij de toren. Tik op je paard en sla de toren.",
    "Hebbes! Een toren gepakt met je paard. Vijf punten gewonnen!",
    "Tik op je paard en spring naar de toren die het handje aanwijst.",
    "Nu met de dame. Zij is sterk en pakt ver weg. Sla de toren!",
    "Knap! Je dame pakte de toren.",
    "Tik op je dame en pak de toren die het handje aanwijst.",
    "Je kunt twee stukken pakken. Een paard van drie punten, of een toren van vijf. Pak altijd de sterkste!",
    "Top! De toren is vijf punten, meer dan het paard. Altijd het sterkste pakken!",
    "Bijna! Je pakte het paard, drie punten. Maar de toren is meer waard. Pak de sterkste!",
    "Nu goed opletten! Pak alleen het stuk dat veilig is. De loper bij de rand wordt verdedigd door een pion. De toren staat helemaal alleen.",
    "Knap! De toren stond onverdedigd, die pak je gratis. Vijf punten!",
    "Oei! Zag je dat? De pion sloeg jouw dame terug. De loper werd verdedigd. Dat kostte je je sterkste stuk!",
    "Soms slaat de tegenstander jouw stuk. Dan sla je gewoon terug! Dat heet terugslaan.",
    "Au! Ik pakte net je pion met mijn toren. Maar nu staat mijn toren onbeschermd. Pak hem terug met je loper!",
    "Mooi teruggeslagen! Nu sta je weer gelijk. Goed onthouden: sla bijna altijd terug!",
    "Wauw! Nu weet je hoeveel de stukken waard zijn, en hoe je slim slaat. Wat ben jij knap geworden!",
    "Je kunt nu slaan met al je stukken. Je wordt steeds beter, zeg!",
    # module: mat oefenen
    "Je kent al schaak en mat. Nu ga je het echt oefenen. Het wordt een beetje moeilijker!",
    "Kijk naar de zwarte koning. Staat hij schaak?",
    "Ja! De dame valt de koning aan over de lijn. Dat is schaak.",
    "Kijk nog eens. De dame staat op dezelfde lijn als de koning. Dat ís schaak.",
    "Klopt! De dame raakt de koning niet. Hij is veilig.",
    "Kijk goed. De dame raakt de koning helemaal niet. Het is geen schaak.",
    "Ja! De loper valt de koning schuin aan. Schaak!",
    "Volg de schuine lijn van de loper. Die komt precies bij de koning. Dat is schaak.",
    "Goed! En als JIJ schaak staat? Dan moet je je koning redden. Er zijn drie manieren.",
    "Eén: loop weg! Jouw koning staat schaak. Zet hem op een veilig vakje, weg van de lijn.",
    "Knap weggelopen! Je koning is veilig.",
    "Twee: zet er iets voor! Schuif je toren tussen de koning en de aanvaller, als een schildje.",
    "Mooi geblokt! De toren staat er als een schildje voor.",
    "Drie: sla de aanvaller! Pak het stuk dat jouw koning schaak geeft.",
    "Hebbes! De aanvaller is weg, je koning is veilig.",
    "Top! Nu ga je zelf matzetten. Drie verschillende manieren.",
    "Mat met je twee torens! De ene toren bewaakt al een rij. Schuif de andere helemaal naar boven.",
    "Een tipje: schuif je toren op de h-lijn naar boven, naar h8.",
    "De achterste-rij-mat! De koning zit gevangen achter zijn eigen pionnen. Schuif je toren naar de bovenste rij.",
    "Een tipje: schuif je toren naar boven, naar e8.",
    "Damemat met hulp van je koning! Zet je dame vlak naast de zwarte koning. Jouw koning past op de dame.",
    "Een tipje: zet je dame op g7, vlak naast de koning.",
    "Pas op! Soms lijkt het mat, maar is het pat. Bij pat kan de koning niet meer zetten, maar staat hij NIET schaak. Dan is het gelijk.",
    "Kijk goed. Is dit schaakmat, of pat?",
    "Goed gezien! De koning kan nergens heen, maar staat niet schaak. Dat is pat, dus gelijkspel.",
    "Kijk: de koning staat niet schaak, en kan niet zetten. Dat is pat, geen mat.",
    "Precies! De dame geeft schaak en de koning kan niet weg. Schaakmat!",
    "Kijk: de dame valt de koning aan en hij kan niet ontsnappen. Dat is mat.",
    "Je bent nu een echte matmeester! Eén bijzondere slag heb je nog niet gezien. Hij heet en passant.",
    "Wauw! Je herkent schaak, mat en pat, je komt uit schaak, en je kent en passant. Wat ben jij goed!",
    # module: slim openen
    "Je kent de eerste stappen al. Nu leer je openen als een echte schaker!",
    "Regel één: beheers het centrum. Zet je pion in het midden, twee vakjes vooruit.",
    "Een keuze! Wat is slim aan het begin? Je dame ver naar voren, of eerst een stuk ontwikkelen?",
    "Precies! Haal eerst je stukken eruit. De dame te vroeg wordt opgejaagd, en dan verlies je tijd.",
    "Niet de dame zo vroeg! Die wordt opgejaagd door de kleine stukken. Ontwikkel liever een paard.",
    "Goed! Ontwikkel een paard naar buiten. Hij valt meteen de pion in het midden aan.",
    "Nu je loper naar buiten, naar een actief vakje.",
    "Ontwikkel je ANDERE stukken, niet steeds hetzelfde stuk. Het tweede paard eruit!",
    "En het allerbelangrijkste: zet je koning op tijd veilig. Rokeer!",
    "Wauw! Je beheerst het centrum, al je stukken staan klaar, en je koning is veilig. Zo open je als een kampioen!",
    "Goed bezig!",
    "Knap!",
    # module: mat in het eindspel
    "Nu het belangrijkste eindspel: de kale koning matzetten. Eerst met je dame, dan met je toren!",
    "Mat met de dame! Jouw koning staat al tegenover de zwarte koning. Geef nu mat met je dame op de bovenste rij.",
    "Een tipje: schuif je dame helemaal naar boven, naar h8.",
    "Nu met de toren! Weer staan de koningen tegenover elkaar. Geef mat met je toren op de bovenste rij.",
    "Een tipje: schuif je toren helemaal naar boven, naar a8.",
    "De witte pion rent naar boven. Haalt de zwarte koning hem nog in voordat hij dame wordt?",
    "Klopt! De koning staat te ver weg. De pion wordt dame. Dat heet het vierkant van de pion.",
    "Tel maar mee: de koning staat buiten het vierkant van de pion. Hij is te laat, de pion wordt dame.",
    "Soms hoef je niet eens mat te geven: maak gewoon een nieuwe dame! Jouw koning beschermt de pion. Promoveer hem!",
    "De pion is een dame geworden! Met zo'n dame win je makkelijk.",
    "Tot slot: gebruik de oppositie om door te breken. Zet je koning recht tegenover de zwarte koning, één vakje ertussen.",
    "Knap! Nu heb jij de oppositie. De zwarte koning moet wijken.",
    "Zie je? Nu is er ruimte. Duw je pion verder naar voren!",
    "Geweldig! Je kunt nu matzetten met de dame en de toren, en je brengt een pion naar dame. Echt knap!",
]
for p in PRAISE:
    PHRASES.append(p + " Je hebt alle sterretjes!")
PHRASES.extend(TRY_AGAIN)
PHRASES.extend(PIECE_MIS)


# Uitspraak-correcties: de stem negeert klemtoontekens, dus sommige woorden
# worden fonetisch gespeld voor het geluid (de tekst op het scherm blijft gewoon).
# LET OP: dezelfde lijst staat in js/speech.js.
PRON = [(re.compile(r"\brokeren\b", re.I), "rokeeren")]


def pronounce(s):
    for rx, rep in PRON:
        s = rx.sub(rep, s)
    return s


def norm(s):
    return " ".join(s.split()).lower()


def slug(s):
    base = re.sub(r"[^a-z0-9]+", "-", norm(s))[:32].strip("-")
    return base or "zin"


async def gen_one(outdir, voicecfg, idx, text, manifest):
    fname = f"{idx:03d}-{slug(text)}.mp3"
    path = os.path.join(outdir, fname)
    spoken = pronounce(text)  # geluid: fonetische spelling; sleutel: norm(spoken)
    for attempt in range(3):
        try:
            await edge_tts.Communicate(spoken, voicecfg["voice"], rate=voicecfg["rate"], pitch=voicecfg["pitch"]).save(path)
            if os.path.getsize(path) > 500:
                manifest[norm(spoken)] = fname
                return True
        except Exception as e:
            if attempt == 2:
                print("  ! mislukt:", text[:36], "->", e)
            await asyncio.sleep(1.0)
    return False


async def gen_voice(voicecfg, items):
    outdir = os.path.join(AUDIO, voicecfg["id"])
    os.makedirs(outdir, exist_ok=True)
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
    print(f"\nKlaar. {len(VOICES)} stemmen, {len(items)} zinnen elk.")


if __name__ == "__main__":
    asyncio.run(main())
