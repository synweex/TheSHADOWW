# 🏙️ SkyStack City

Joc mobil de construit turnuri bloc cu bloc: o macara balansează blocurile, iar tu atingi ecranul ca să le lași exact peste etajul de dedesubt. Îți construiești orașul, faci misiuni și urci la nesfârșit — prin nori, stratosferă, până în spațiu.

Joc HTML5 (canvas), fără dependențe și fără build. Merge în browserul telefonului și se poate instala ca aplicație (PWA, funcționează și offline).

## Moduri de joc

- **🏙️ Orașul meu** — 12 loturi în 3 cartiere (Cartierul Verde, Centrul Vechi, Downtown). Cumperi terenuri și construiești Casă (6 etaje), Bloc (12), Birouri (20) sau Zgârie-nori (32). Locuitorii cresc rangul orașului: Sat → Comună → Orășel → Oraș → Municipiu → Metropolă → Megalopolis.
- **🎯 Misiuni** — 16 provocări cu până la 3 stele: vânt, timp limită, o singură viață, blocuri înguste, macara rapidă sau care alunecă pe șine, combo-uri, populație țintă.
- **🚀 Endless** — construiești la nesfârșit. Cu cât urci, cu atât se schimbă cerul: Orașul → Nori (20) → Altitudine de zbor (40) → Stratosferă (60) → **Spațiu** (80) → Orbită joasă → Spre Lună → Planetele → Spațiu adânc → Altă galaxie. Sus, etajele devin module spațiale, gravitația scade, iar curenții de aer și macaraua mobilă îngreunează jocul.

## Cum se joacă

- Atinge ecranul (sau Space/Enter pe calculator) ca să lași blocul.
- Centrat = **PERFECT**: mai mulți locuitori, combo și un turn mai stabil.
- Un bloc ratat = o viață pierdută. Turnul se balansează tot mai tare pe măsură ce crește.
- Monedele 🪙 câștigate cumpără loturi și tipuri noi de clădiri.

## Rulare

```bash
python3 -m http.server 8000
# deschide http://localhost:8000 (sau IP-ul calculatorului, de pe telefon)
```

Pentru a-l juca pe telefon de oriunde, poți publica folderul pe GitHub Pages / Netlify / Cloudflare Pages, apoi „Adaugă pe ecranul principal”.

## Structură

```
index.html            ecrane + HUD
style.css             stiluri (mobile-first)
js/data.js            clădiri, misiuni, zone de altitudine
js/game.js            motorul jocului: macara, fizică, turn, cer/spațiu
js/ui.js              meniuri, oraș, misiuni, rezultate, bucla principală
js/audio.js           sunete sintetizate (WebAudio) + vibrații
js/storage.js         salvare progres (localStorage)
sw.js, manifest.webmanifest, icon.svg   PWA / offline
```
