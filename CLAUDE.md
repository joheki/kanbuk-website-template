# CLAUDE.md – Das Regelwerk des Motors

> Diese Datei gilt für **jeden Klon**. Sie ist für Claude Code die verbindliche
> Arbeitsanweisung. **Vor jeder Änderung lesen.**

---

## 0. Mit wem du arbeitest (**zuerst lesen**)

**Lies als Allererstes `STAND.md`** – das Gedächtnis dieses Projekts. Dort stehen
Phase, Lücken-Inventar und bisherige Entscheidungen. Nach jeder Arbeitssitzung
**aktualisierst du sie** (Pflicht): Verlaufszeile ergänzen, erledigte Punkte abhaken,
neue Lücken eintragen. Ein Chat-Bericht ist nach dem Chat weg – diese Datei nicht.

Mit dem Template arbeiten wechselnde Personen (Inhaber, Partner, Mitarbeiter).
**Gehe standardmäßig davon aus, dass die Person nicht programmiert** und die Website
ausschließlich über Claude Code verwaltet. Zeigt sich im Gespräch technisches
Verständnis, darfst du die Detailtiefe anheben – die übrigen Regeln gelten immer:

- **Du führst, der Nutzer entscheidet.** Erkläre, was du tust, in normaler Sprache –
  nicht in Dateipfaden und Fachbegriffen. Der Nutzer will wissen *was jetzt passiert* und *was er davon
  hat*, nicht welche Funktion du umgebaut hast.
- **Frag nur bei wirklich Wichtigem.** Alles, was du selbst entscheiden kannst,
  entscheidest du selbst und **sagst es hinterher**. Eine Rückfrage kostet ihn mehr
  Zeit als eine Korrektur.
- **Erfinde niemals Kundendaten.** Fehlt etwas Rechtliches oder Inhaltliches: klar
  markierten Platzhalter setzen (`PLATZHALTER: UID`) und **in den Bericht schreiben** –
  nicht mittendrin nachfragen.
- **Kein Fachjargon in Berichten.** Statt „JSON-LD-Schema für openingHoursSpecification
  ergänzt" → „Die Öffnungszeiten erscheinen jetzt direkt in der Google-Suche."
- **Sag ehrlich, wenn etwas nicht klappt.** Der Nutzer kann es oft nicht selbst nachprüfen
  und ist darauf angewiesen, dass du Probleme benennst statt sie zu überspielen.
- **Am Ende immer:** was fertig ist, die Vorschau-Adresse, und die **konkreten offenen
  Punkte für den Live-Gang** (Impressum, Platzhalter tauschen …).

Beim Bauen einer Seite gilt zusätzlich der **Ein-Rutsch-Grundsatz**: ein Prompt, ein
Design-Link → fertige Seite, ohne Zwischenfragen. Details im `/port`-Skill.

---

## 1. Was dieses Repo ist

Dieses Repository ist **kein Design-Template**. Es ist der **technische Motor** für
Websites Wiener Kleinbetriebe.

Es legt fest, **wie** eine Seite gebaut sein muss: Meta-Tags, Responsiveness, Sicherheit,
Barrierefreiheit, DSGVO, Ladezeit, Recht. Es legt **nicht** fest, wie sie aussieht.

**Das Design kommt aus Claude Design.** Pro Kunde wird dort die komplette Website visuell
gebaut – mit allen Unterseiten und echten Inhalten. Der Motor setzt dieses Design
technisch sauber um.

Technik: **Astro, rein statischer Build.** Kein CMS, keine Datenbank, kein Login.

### Die Arbeitsteilung

| Claude Design liefert | Der Motor liefert |
| --- | --- |
| Layout & Komposition jeder Seite | Echte Routen mit eigener URL |
| Farben, Schriften, Bildsprache | Meta-Tags, JSON-LD, Sitemap, OG |
| Die sichtbaren Texte | Responsiveness (350–1440 px) |
| Struktur der Unterseiten | Formulare, Sicherheit, DSGVO |
| Welche Blöcke es gibt | Verhalten (Tabs, Slider, Filter …) |

**Merksatz:** Der Motor liefert die Mechanik, das Design den Lack.

### Ein Klon ist eigenständig

Sobald ein Kundenprojekt aus diesem Template entsteht, lebt es **komplett in seinem
Ordner**. Es gibt keine Updates vom Template zurück in Kundenprojekte. Das Template
bleibt hier neutral stehen und ist nur der Startpunkt.

### Das Template bleibt kundenfrei (**strikt**)

**Niemals Daten eines echten Kunden ins Template schreiben** – auch nicht als Beispiel,
auch nicht in einem Kommentar. Kein Betriebsname, keine Adresse, keine Telefonnummer,
keine Markenfarben, kein Schriftpaar, kein Design-Link.

Der Grund ist praktisch: Das Template ist die Vorlage für **alle** Kunden. Steht dort
die Adresse von Kunde A als Beispiel, trägt Kunde B sie in seinem Ordner mit sich
herum – und irgendwann landet sie versehentlich auf seiner Seite. Kundendaten gehören
ausschließlich in den jeweiligen Kundenordner.

Für Beispiele gilt: **erfundene Musterdaten** (`Muster Betrieb`, `Musterstraße 1`,
`muster-betrieb.example`) oder Platzhalter (`"<Name>"`). Das Prüf-Tor kennt diese
Marker und meldet sie beim Kunden als „noch zu ersetzen".

Umgekehrt genauso: Aus einem Kundenordner fließt **nichts** ins Template zurück.
Verbesserungen am Motor gehören als neutraler Code hierher – die Inhalte bleiben dort.

---

## 2. Die eisernen Regeln

Diese Regeln sind **nicht verhandelbar**. `npm run check` erzwingt sie – eine Seite,
die dagegen verstößt, darf nicht raus.

- ❌ **Keine externen Requests beim Laden.** Keine CDN-Schriften, keine fremden Skripte,
  keine Fremdbilder. Alles liegt lokal. (Fremder Server = DSGVO-Problem + Ladezeit.)
- ❌ **Keine festen Pixelbreiten.** Alles fluid über die Token-Skala (Abschnitt 4).
- ❌ **Keine neuen npm-Pakete** ohne vorherige Rückfrage.
- ✅ **Jede Seite** braucht eigenen Titel, eigene Description, eigene Canonical, OG-Bild.
- ✅ **Jedes Bild** braucht einen Alt-Text.
- ✅ **Genau eine `<h1>`** je Seite.

**Standard: cookiefrei, kein Tracking, kein Banner.** Das ist der Normalfall und ein
Verkaufsargument – kein Banner heißt bessere Bedienung und mehr Anfragen.

Will ein Kunde **ausdrücklich** einen Pixel oder eine bediente Karte, ist das möglich –
aber **nur über die Anschlüsse des Motors** (Abschnitt 7a):

- ❌ **Nie** ein Tracking-Skript direkt ins Markup. Immer über `dienste` in der Config,
  damit es bis zur Einwilligung geparkt bleibt.
- ❌ **Nie** ein `<iframe>` fest im HTML. Anfahrt = statisches Bild (`npm run karte`);
  wenn es unbedingt ein Rahmen sein muss: `<Einbettung>` (2-Klick).

Das Prüf-Tor setzt beides durch.

---

## 3. Sprachregeln für alle Kundentexte

Die Texte kommen meist aus dem Design. Wenn du welche schreibst oder korrigierst:

- **Österreichisches Standarddeutsch** („Jänner", „heuer", „Mehlspeise").
- **Korrekte ß-Schreibung** (Straße, Grüße, außerdem). Kein Schweizer „ss".
- **Ansprache** laut `ansprache: 'du' | 'sie'` (Standard `sie`). Die Motor-Texte
  (Formular) schalten automatisch mit (`src/lib/texte.ts`). Impressum und Datenschutz
  bleiben immer formal (Sie).
- Der Betrieb spricht **als „wir"**.
- **Keine erfundenen Zahlen, keine Superlative.** Nicht „die besten Schnitzel Wiens",
  keine erfundenen Bewertungen oder Jahreszahlen. Nur, was der Kunde bestätigt.
- **Kurze Sätze.** Klar, konkret, ohne Werbe-Blabla.

---

## 4. Das Token-System (**der Kern des Portierens**)

Claude Design liefert **feste Pixelwerte** – in einem typischen Design mehrere hundert,
ohne ein einziges `clamp()` und ohne Media-Queries. Diese Werte werden **niemals übernommen** – sie werden auf die Token
aus `src/styles/global.css` abgebildet. Dadurch wird das Portieren mechanisch statt
kreativ, und das Ergebnis ist automatisch responsiv.

### Umrechnungstabelle

Die Skala ist so gerechnet, dass sie die typischen Design-Werte bei **1280 px** trifft.

| Design (fest) | Motor-Token | bei 1280 px |
| --- | --- | --- |
| `padding: 92px` (Sektion) | `var(--raum-2xl)` | ~92px |
| `padding: 64px` / `gap: 64px` | `var(--raum-l)` | ~64px |
| `gap: 40px` / Seitenrand | `var(--raum-m)` bzw. `var(--gutter)` | ~40px |
| `gap: 24px` | `var(--raum-s)` | ~24px |
| `gap: 16px` | `var(--raum-xs)` | ~16px |
| `gap: 8px` | `var(--raum-2xs)` | ~12px |
| `max-width: 1280px` | `var(--container)` (via `.container`) | 1280px |
| `font-size: 72px` (Hero) | `var(--schrift-4xl)` | ~72px |
| `font-size: 40px` (h2) | `var(--schrift-2xl)` | ~40px |
| `font-size: 28px` (h3) | `var(--schrift-xl)` | ~28px |
| `font-size: 16px` (Text) | `var(--schrift-m)` | 16px |
| `font-size: 14px` | `var(--schrift-s)` | 14px |
| jeder Hex-Wert | `var(--farbe-…)` | – |

**Farben nie direkt ins Markup.** Sie stehen in `content.config.ts → design.farben` und
werden zu `--farbe-<name>` (siehe `src/lib/theme.ts`).

### Pflichtmuster für Responsiveness

```css
/* Grid, das nie überläuft – min() ist Pflicht */
grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));

/* Zweispalter aus dem Design: am Handy einspaltig */
.reihe { display: grid; gap: var(--raum-m); }
@media (min-width: 800px) { .reihe { grid-template-columns: 1fr 1fr; } }
```

**Die Handy-Ansicht ist deine Entscheidung, nicht die des Designs** – dort gibt es sie
nicht. Standardregeln: zwei Spalten → eine; vier Spalten → zwei → eine; Bild neben Text →
Bild über Text; Sticky-Leisten am Handy prüfen (verdecken sie Inhalt?).

---

## 5. Verhaltens-Bausteine (`src/lib/verhalten/`)

Mechanik ohne Aussehen. **Branchenneutral**: „Tabs" sind Speisekarten-Kategorien beim
Wirt, Wochentage beim Yoga-Studio, Leistungsbereiche beim Installateur. Nie selbst neu
bauen – anschließen und im Design anmalen.

| Baustein | Aktiviert durch | Typischer Einsatz |
| --- | --- | --- |
| **Tabs** | `data-tabs` + `data-tab` / `data-tabpanel` | Speisekarte, Kursplan, Leistungen |
| **Filter** | `data-filter` + `data-kategorie` | Galerie, Referenzen |
| **Slider** | `data-slider` + `data-slider-spur` | Galerie, Stimmen |
| **Akkordeon** | `data-akkordeon` (nativ `<details>`) | FAQ, Preisgruppen |
| **Lightbox** | `data-lightbox` (nativ `<dialog>`) | Galerie |
| **Mobilmenü** | `data-menue-schalter` + `data-menue` | Navigation |
| **Vergleich** | `data-vergleich` | Vorher/Nachher |
| **Formular** | `<Formular id="…" />` | Kontakt, Reservierung, Termin |
| **Einwilligung** | automatisch, wenn `dienste` gefüllt | Pixel/Tracking (Abschnitt 7a) |
| **Einbettung** | `<Einbettung url=… />` | Maps/YouTube per 2-Klick (Abschnitt 7a) |

Sie vergeben nur ARIA-Attribute und Zustandsklassen (`.ist-aktiv`, `.ist-offen`).
Alles funktioniert **ohne JS** sinnvoll. Details stehen im Kopf jeder Datei.

---

## 6. `content.config.ts` – die Motor-Schnittstelle

**Faustregel:** Steht es im Browser-Tab, in Google, in einer E-Mail oder im Impressum →
Config. Sieht man es auf der Seite → Design.

Dort stehen: Betriebsdaten (Name, Kontakt, Adresse, Öffnungszeiten), Design-Tokens,
Seiten samt SEO, Formulare, Preisliste, Rechtstexte, Steuerung (`mode`, `branche`,
`ansprache`, `sprachen`, `domain`).

**Mehrsprachigkeit:** `sprachen: ['de','en']` nur setzen, wenn die englischen Seiten
wirklich als Routen gebaut werden (`src/pages/en/…`) – sonst zeigen die automatischen
hreflang-Verweise ins Leere. Das Prüf-Tor kontrolliert das.

**Ausnahme mit Absicht:** Tabellarische Daten, die sich oft ändern (Speisekarte,
Preisliste), stehen hier – damit eine Preisänderung eine Ein-Datei-Änderung bleibt.
Bei sehr großen Karten (mehrere Kategorien, hunderte Positionen) in
`daten/preisliste.ts` auslagern und importieren.

**Allergene sind in der Gastronomie Pflicht** (österreichische Kennzeichnung A–R),
sobald Speisen gelistet sind. Feld: `PreisPosition.allergene`.

---

## 7. mode-Logik (`mode: 'demo' | 'live'`)

Der Unterschied ist **nicht die Qualität, sondern nur die Zugänge**. Die Vorschau ist
die fertige Seite – mit gezogenem Stecker.

**`demo` (Vorschau für einen Lead):**
- Kanbuk-Balken oben, Formular zeigt „In der Live-Version aktiv"
- Telefonnummer **nicht** als `tel:`-Link
- `noindex, nofollow` als Meta **und** als HTTP-Header (`X-Robots-Tag`)
- `robots.txt` sperrt alles, keine Sitemap
- **Braucht keinen Resend-Schlüssel, keine echte Domain, keine echten Rechtstexte**

**`live` (die Seite soll öffentlich sein – im Standardablauf: der Kunde hat gebucht):**
kein Balken, Formular scharf (Resend), `tel:` klickbar,
Indexierung an, Sitemap. Zusätzlich nötig – und das sind **die einzigen drei Dinge**:

1. **Echte Rechtstexte** (UID, Firmenbuch – Impressumspflicht in Österreich)
2. `RESEND_API_KEY` + `CONTACT_FROM` (damit das Formular sendet)
3. Domain verbinden

`_headers`, `_redirects` und `vercel.json` erzeugt der Build **automatisch** aus dem
`mode` (siehe `astro.config.ts`) – da ist nichts von Hand zu ändern. Früher musste man
den `X-Robots-Tag` händisch aus `vercel.json` löschen; wurde das vergessen, blieb die
Seite für Google unsichtbar, ohne dass es jemandem auffiel. Solche stillen Fallen darf
ein Motor nicht haben.

---

## 7a. Ausbau: Tracking, Pixel, Einbettungen

**Der Normalfall bleibt: cookiefrei, kein Banner.** Das ist kein Zufall, sondern ein
Verkaufsargument – kein Banner heißt bessere Bedienung und mehr Anfragen. Solange
`dienste: []` leer ist, wird nichts geladen, nichts gesetzt, nichts gerendert.

Der Motor bringt die **Anschlüsse** aber fertig mit. Ein späterer Ausbau ist deshalb
Konfiguration, kein Neubau.

### Pixel / Tracking / Ads

Dienst in `content.config.ts → dienste` eintragen – fertig. Automatisch passiert dann:

- Der Einwilligungs-Banner erscheint (`src/components/Einwilligung.astro`)
- Das Skript wird als `<script type="text/plain" data-einwilligung="marketing">`
  **geparkt** – der Browser führt es **nicht** aus. Erst nach dem Ja wird daraus ein
  echtes `<script>`. Das ist Opt-in, wie es die DSGVO verlangt.
- Der Dienst erscheint **automatisch in der Datenschutzerklärung**, samt Anbieter,
  Zweck und Widerruf-Knopf.

**Nie ein Tracking-Skript direkt ins Markup schreiben.** Das Prüf-Tor blockt es.

### Google Maps, Instagram, YouTube

Ein `<iframe>` lädt sofort und setzt Cookies – deshalb **nie fest ins HTML**.
Zwei zulässige Wege:

1. **Statisches Bild + Link** (`npm run karte`) – der Standard für die Anfahrt.
   Kein Rahmen, kein Klick, keine Diskussion.
2. **2-Klick-Einbettung** (`<Einbettung>`) – wenn der Kunde unbedingt eine bediente
   Karte oder ein Video will. Der Rahmen entsteht erst beim Klick; vorher geht kein
   Byte raus. Der Klick ist die Einwilligung für diesen Fall.

**Instagram-Grid:** Kein API-Anschluss im Motor – Meta ändert die Schnittstelle
ständig, Tokens laufen ab, und ein Klon bekommt keine Updates. Das wäre eine
Zeitbombe. Stattdessen: kuratierte Fotos in der Galerie (sieht ohnehin besser aus)
oder eine 2-Klick-Einbettung.

### Was NICHT in den Motor gehört

Shop, Buchungssystem, Blog, Newsletter-Verwaltung. Zu unterschiedlich je Kunde. Wenn
ein Kunde das braucht, baut es der jeweilige Chat in seinem Ordner – der Motor liefert
die Grundlage (Routen, Formular-Motor, Token, Einwilligung), auf der das aufsetzt.

---

## 7b. Weiterleitungen (**wird gern vergessen**)

Hatte der Betrieb **schon eine Website**, haben die alten Seiten Adressen, die bei
Google stehen und auf die andere verlinken. Ohne Weiterleitung laufen die alle ins
Leere – der Kunde verliert über Nacht seine mühsam aufgebaute Sichtbarkeit.

Deshalb: alte Adressen erfassen und in `weiterleitungen` eintragen:

```ts
weiterleitungen: [
  { von: '/speisen.html', nach: '/speisekarte' },
  { von: '/kontakt.php',  nach: '/kontakt' },
],
```

Daraus entstehen beim Bauen automatisch `_redirects` (Cloudflare/Netlify) und der
`redirects`-Block in `vercel.json`. Standard ist 301 – das vererbt das Ranking.

---

## 8. Das Portier-Rezept

Immer gleich. Details im `/port`-Skill (`.claude/skills/port/SKILL.md`).

1. **Inventar** – Design-Projekt auslesen: Seiten, Schriften, externe Ressourcen,
   Bilder, Verhalten (Tabs? Filter? Sprachen?), Lücken (Platzhalter?).
2. **Entgiften** – `npm run schrift` je Schrift, `npm run karte` für die Anfahrt,
   Maps-Rahmen raus, Fremdbilder lokal.
3. **Config füllen** – Betriebsdaten, Design-Tokens, Seiten samt SEO, Formulare,
   Preisliste, **Weiterleitungen** (falls es eine Vorgänger-Website gab, Abschnitt 7b). `package.json → name` auf `kanbuk-<kunde>` setzen (schaltet das
   Prüf-Tor scharf).
4. **Seiten bauen** – je Unterseite eine Datei in `src/pages/`, je Sektion eine
   Komponente in `src/components/`. **Nur Tokens**, nie feste Pixel, nie Farbwerte.
5. **Prüfen** – `npm run check` muss grün sein. Dann Sichtprüfung bei 350/768/1440.
6. **STAND.md füllen** (Pflicht: Phase, Lücken-Inventar, Entscheidungen, Verlauf)
   und dem Nutzer berichten: Was ist Platzhalter, was fehlt vor dem Live-Gang.

---

## 9. Definition of Done

1. `npm run check` ist **grün** (baut selbst und prüft die fertige Seite).
2. `npm run dev` läuft fehlerfrei.
3. Sichtprüfung bei **350 / 768 / 1440 px**: kein horizontales Scrollen, nichts springt.
4. Lighthouse-Ziel **≥ 95** in allen vier Kategorien.
5. **STAND.md ist aktuell** (Phase, Lücken, Verlaufszeile dieser Sitzung).
6. Committen und pushen (ein Kunde = ein Repo/Branch).

---

## 9a. Bilder

**Alle Bilder liegen in `fotos/`** – ein einziger Ordner im Projekt-Hauptordner.
Das ist bewusst der Ort, an dem auch der Nutzer selbst Fotos ablegt – ohne
technische Pfade kennen zu müssen.

- **Vor dem Port immer `ls fotos/`** – der Nutzer legt seine Fotos oft schon vorher
  ab. Die haben Vorrang vor allem anderen.
- Zuordnung selbst treffen (Dateiname + Bildinhalt), im Bericht nennen. Nicht fragen.
- Einbinden über `bild('name.jpg')` (`src/lib/bilder.ts`) + `<Image>` aus
  `astro:assets`. Nie ein rohes `<img src>` – dann fehlt die Optimierung.
- Unterordner sind erlaubt: `bild('hero.jpg')` findet auch `fotos/galerie/hero.jpg`.
- **Jeder Platzhalter kommt ins Lücken-Inventar.**

Die Referenzseite bindet bewusst ein Bild ein, damit die Pipeline bei jedem Build
durchlaufen wird – sonst bliebe ein kaputter Bildpfad still, bis er beim Kunden
auffällt. Das Prüf-Tor schlägt an, wenn in `fotos/` Bilder liegen, im Build aber
keines optimiert wurde.

---

## 10. Werkzeuge

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Vorschau lokal |
| `npm run check` | **Das Prüf-Tor** – baut und prüft den Standard |
| `npm run schrift -- --familie "<Name>"` | Google-Schrift lokal einbetten |
| `npm run karte -- --adresse "…"` | Statisches Kartenbild (statt Maps-Embed) |
| `npm run platzhalter -- …` | Textlose Platzhalterbilder + OG + Favicon |
| `npm run stock -- --thema "…"` | Stock-Platzhalter (braucht `PEXELS_API_KEY`) |

**Stock-Bilder sind immer nur Platzhalter** – für Live-Seiten echte Kundenfotos.
