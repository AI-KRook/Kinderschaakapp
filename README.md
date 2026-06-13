# Schaken met Hinnik 🐴♟️

Een vrolijke web-app (PWA) waarmee een kind van ongeveer 5 jaar leert schaken. **Alles wordt hardop in het Nederlands uitgelegd** door Hinnik het pratende schaakpaardje, zodat een kind dat nog niet kan lezen de app helemaal zelf kan gebruiken: luisteren en kijken is genoeg.

Geen account, geen reclame, geen tracking. Na de eerste keer laden werkt de app ook offline.

## Wat de app kan

- **Hinnik, de pratende mascotte.** Hij is altijd in beeld, legt elke stap hardop uit, beweegt zijn mond terwijl hij praat, juicht bij een goede zet en moedigt zacht aan bij een misser. Met de grote ronde knop met het luidsprekertje (🔊) herhaalt hij de laatste uitleg.
- **Beeldmenu met iconen** (geen leesmenu) en grote knoppen.
- **Sterren verzamelen en Hinnik aankleden.** Bij de oefeningen verdient het kind sterretjes. Tik op de sterrenbalk op het menu om de verkleedkast te openen: met gespaarde sterren verdient het kind hoedjes, een kroon, een bril en meer voor Hinnik, die hij dan overal draagt. Een sterke reden om te blijven spelen.
- **Zes korte lessen**, in volgorde te doen of los te kiezen:
  1. **Het bord.** Kennismaken met de vakjes.
  2. **De stukken.** Toren, loper, paard, dame, koning en pion, elk met een uitgebreide uitleg (hoe het loopt, sterk of zwak, een leuk weetje) en een sterren-route: het kind verzet het stuk meerdere keren om sterretjes te verzamelen. Veel herhaling, dus het blijft hangen.
  3. **Slaan.** Een stuk van de tegenstander pakken: recht, schuin, en de bijzondere en-passant-slag van de pion.
  4. **Schaak en mat.** Wat schaak is en hoe je eruit komt (de drie manieren worden op het bord voorgedaan), zelf schaak geven, rokeren (kort, lang, en wanneer het niet mag), en meerdere mat-in-één puzzels om zelf op te lossen, met een hint als het lang duurt.
  5. **Puzzels.** Korte tactiek-puzzels met zes verschillende motieven: de dame winnen, een pion promoveren, een vork met het paard, een vork met een pion, en mat in één. Elke puzzel een sterretje.
  6. **Een partijtje.** Een echte partij tegen de computer. Het kind kiest eerst de kleur (wit of zwart; bij zwart draait het bord om en begint de computer), kiest de moeilijkheid in vier niveaus, en kan altijd om een hint vragen.
- **Schaak in beeld.** De koning die wordt aangevallen gloeit rood, zodat een kind dat nog niet leest meteen ziet dat de koning gevaar loopt.
- **Ouder-knop** (het tandwiel ⚙️ linksboven): **houd het ongeveer 1 seconde ingedrukt** om de instellingen te openen. Daar kun je het geluid aan/uit zetten, de spreeksnelheid kiezen, de stem kiezen en de moeilijkheid van de computer in vier niveaus instellen.
- **Geluidsknop** (🔊) rechtsboven: zet het geluid snel aan of uit. De knop laat duidelijk zien of het geluid aanstaat.

## Hoe start ik de app lokaal (op de computer)?

De app is gemaakt met gewone HTML, CSS en JavaScript: er is geen bouwstap nodig. Wel moet de app via een kleine webserver worden geopend (niet door dubbelklikken op het bestand), anders werkt de offline-functie niet.

In de map van het project:

```bash
# met Python (staat op de meeste computers):
python -m http.server 8000
```

Open daarna in de browser: <http://localhost:8000>

Tip: gebruik Chrome of Safari. Klik op de grote knop **"Tik om te beginnen"**. Die ene tik zet het geluid aan (dat is een regel van de telefoon/browser: geluid mag pas afspelen na een tik).

## Hoe test ik het op mijn iPhone?

De makkelijkste manier is via **GitHub Pages**, want dan krijg je een `https`-adres dat overal werkt (https is nodig voor een PWA en voor het geluid).

1. Zet de code op GitHub (zie hieronder) en zet **GitHub Pages** aan.
2. Open op je iPhone in **Safari** het adres:
   `https://ai-krook.github.io/Kinderschaakapp/`
3. Tik op de grote knop **"Tik om te beginnen"**. Hinnik begint te praten.

### Op het beginscherm zetten (als app installeren)

1. Open het adres in **Safari** op de iPhone.
2. Tik onderaan op de **Deel-knop** (het vierkantje met het pijltje omhoog).
3. Kies **"Zet op beginscherm"** en tik op **"Voeg toe"**.
4. Nu staat Hinnik als een echte app op het beginscherm en opent hij schermvullend.

## GitHub Pages aanzetten (eenmalig)

1. Ga op GitHub naar de repository → **Settings** → **Pages**.
2. Bij **Source** kies je **"Deploy from a branch"**.
3. Kies branch **`main`** en map **`/ (root)`** en klik **Save**.
4. Wacht ongeveer een minuut. De app staat dan op:
   `https://ai-krook.github.io/Kinderschaakapp/`

## Privacy en veiligheid

- Geen account, geen inloggen, geen e-mailadres.
- Geen reclame, geen externe trackers, geen analytics.
- Geen chat en geen online contact met anderen.
- Geen externe netwerkverzoeken behalve het laden van de app zelf. De spraak draait volledig lokaal in de browser (Web Speech API).
- De voortgang (welke lessen gedaan zijn) en de instellingen worden alleen op het toestel zelf bewaard.

## Techniek (kort)

- **Vanilla JavaScript**, geen framework, geen bouwstap.
- **chess.js** (`vendor/chess.js`) voor alle schaakregels: legale zetten, schaak en mat.
- **Stockfish** (`vendor/stockfish.js`, gratis en open source) draait in een Web Worker. Op volle sterkte is hij de **coach**: met de **hint-knop (💡)** kan het kind altijd een goede zet opvragen, en als het kind lang nadenkt komt Hinnik vanzelf met een tip (oplichtend vakje plus een wijzend handje). Als tegenstander wordt Stockfish alleen op niveau 4 ingezet, en dan op zijn zwakste stand. De engine krijgt zijn sterkte per opdracht mee, zodat de hint sterk blijft terwijl de tegenstander zwak speelt.
- **Vier moeilijkheidsniveaus** voor het partijtje. Niveau 1 tot 3 zijn een zelfgemaakte tegenstander (willekeurig, materiaal pakken, en een slimmer niveau dat één zet vooruitkijkt maar af en toe expres blundert), zodat het kind altijd kan winnen. Niveau 4 is Stockfish op zijn zwakste stand, bedoeld voor grotere kinderen of een ouder; daar wint een kind van 5 zelden. De getallen ELO 100, 350 en 700 zijn een richtlijn voor het gevoel, geen gemeten waarde: zo laag kan de echte engine niet eens ingesteld worden.
- **Tikken tijdens een uitleg = doorgaan.** Tikt het kind terwijl Hinnik nog praat, dan maakt zij haar zin meteen af en gaat het verder. Zo kan een ongeduldig kind doorklikken, maar niet per ongeluk te vroeg een stuk verzetten.
- **De app onthoudt waar hij is.** Open je de instellingen tijdens een uitleg, dan pauzeert Hinnik en gaat ze verder waar ze gebleven was zodra je sluit. Instellingen-geluiden spelen op een apart kanaal, en losse opmerkingen of de hint onderbreken een uitleg niet. Zo loopt de les nooit vast.
- **Coördinaten** (a tot h en 1 tot 8) staan in de rand-vakjes van het bord.
- **Stem:** Hinnik praat met een **vooraf opgenomen neurale stem** (Microsoft Edge TTS). Er zijn twee stemmen om uit te kiezen in de ouder-instellingen: een meisjesstem (`nl-NL-FennaNeural`, standaard) en een jongensstem (`nl-NL-MaartenNeural`). Elke stem heeft een eigen map onder `audio/<stem>/` met een eigen `manifest.json`; `audio/voices.json` houdt bij welke stemmen er zijn. Dit klinkt veel natuurlijker dan een toestel-stem en draait volledig offline en zonder tracking.
- **Terugval:** voor zinnen zonder opname (of als de ouder dat kiest) valt de app automatisch terug op de **Web Speech API** (SpeechSynthesis, `nl-NL`). Die wacht op het laden van de stemmen, knipt lange zinnen in stukjes en ontgrendelt het geluid na de eerste tik (nodig voor iOS Safari).
- **PWA**: `manifest.json` en een service worker (`sw.js`) die de app-bestanden cachet voor offline gebruik.

### De stem opnieuw opnemen of veranderen

De gesproken zinnen worden gemaakt met een klein Python-scriptje:

```bash
pip install edge-tts
python tools/make_voice.py
```

Dit genereert per stem een map `audio/<stem>/` met alle mp3-bestanden plus een `manifest.json`, en schrijft `audio/voices.json`. Welke stemmen worden opgenomen staat bovenin `tools/make_voice.py` in de lijst `VOICES` (met per stem `voice`, `rate`, `pitch` en een `naam` voor in het menu). Een stem toevoegen of veranderen? Pas die lijst aan en draai het script opnieuw. Beschikbare Nederlandse stemmen: `nl-NL-FennaNeural`, `nl-NL-ColetteNeural`, `nl-NL-MaartenNeural` (en de Vlaamse `nl-BE-DenaNeural`, `nl-BE-ArnaudNeural`). Lijst opvragen met `edge-tts --list-voices`. De ouder kiest de stem in de instellingen.

Voeg je nieuwe gesproken zinnen toe aan de app? Zet de exacte tekst ook in de lijst `PHRASES` in `tools/make_voice.py` en draai het script opnieuw. Met `python tools/check_sync.py` controleer je of alle gesproken zinnen ook echt zijn opgenomen. Zinnen die nog geen opname hebben, worden automatisch door de toestel-stem uitgesproken.

De intonatie wordt gestuurd met korte zinnen, komma's en dubbele punten (pauzes), want deze gratis stem negeert losse klemtoontekens zoals "rechtdóór". Alleen woord-accenten die een ander woord maken, zoals "één", werken wel.

### App-iconen opnieuw maken

De iconen in `icons/` zijn gemaakt met een klein Python-scriptje (Pillow):

```bash
python tools/make_icons.py
```

### Belangrijk bij het updaten van de app

De service worker bewaart de bestanden in een cache. Wil je na een wijziging dat iedereen de nieuwe versie krijgt? Verhoog dan het versienummer bovenin `sw.js`:

```js
var CACHE = "hinnik-schaak-v1";   // maak hier bv. v2 van
```

## Wat bewust nog NIET in versie 1 zit

Bewust nog niet meegenomen, voor een latere uitbreiding:

- **Promotiekeuze.** Een pion die de overkant haalt wordt automatisch een dame; je kunt (nog) niet kiezen voor een ander stuk.
- **Online spelen tegen anderen** en een account met voortgang in de cloud.
- **Een visuele schaak-/mat-melding** op het bord (nu vooral met de stem uitgelegd).

## Mappenstructuur

```
index.html            de app-pagina
manifest.json         PWA-instellingen
sw.js                 service worker (offline)
css/styles.css        alle opmaak
js/speech.js          de Nederlandse spraak (Web Speech API)
js/mascotte.js        Hinnik het paardje (tekening + animaties)
js/board.js           het schaakbord (tekenen, slepen, tikken, highlights)
js/bot.js             de computer-tegenstander
js/modules.js         de vijf lessen
js/app.js             het samenspel: schermen, instellingen, lesverloop
vendor/chess.js       chess.js (schaakregels)
icons/                de app-iconen
tools/make_icons.py   scriptje om de iconen te maken
```
