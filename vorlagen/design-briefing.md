# Design-Briefing für Claude Design

> **So benutzt du das:** Beim Anlegen eines neuen Kunden-Designprojekts in Claude Design
> den Block unten **einmal komplett einfügen**, danach die Lead-Daten (Website-Link,
> Fotos, Speisekarte, Öffnungszeiten) dazugeben.

---

## Warum das Briefing so kurz ist

Es steht bewusst **nur drin, was der Motor später nicht reparieren kann.**

| Der Motor repariert selbst | Muss im Design stimmen |
| --- | --- |
| Responsiveness (Handy-Ansicht) | Sprache & Ton |
| Schriften lokal einbetten | Keine erfundenen Fakten |
| Maps-Rahmen → statisches Bild | Sinnvoller Seiten-Schnitt |
| Echte URLs, Meta-Tags, SEO | Vollständigkeit der Inhalte |
| Formulare scharf schalten | |
| Bilder optimieren | |

**Kümmere dich in Claude Design also nicht um Technik.** Feste Pixel, Desktop-Layout,
CDN-Schriften, ein Maps-Rahmen – alles egal, das wird beim Portieren umgebaut. Gestalte.

---

## Der Briefing-Text (kopieren)

```text
Du gestaltest die Website eines Wiener Kleinbetriebs. Bitte halte dich an
folgende Regeln – sie betreffen INHALT und STRUKTUR, nicht die Technik.

SPRACHE
- Österreichisches Standarddeutsch. Also "Jänner" statt "Januar", "heuer",
  "Mehlspeise", "Erdäpfel" – wo es natürlich passt, nicht gekünstelt.
- Korrekte ß-Schreibung: Straße, Grüße, außerdem. Kein Schweizer "ss".
- Der Betrieb spricht als "wir" ("Wir backen jeden Morgen frisch.").
- Ansprache durchgehend einheitlich: entweder Sie oder du. Richte dich nach
  dem Auftritt des Betriebs (Beisl/Studio eher "du", Praxis/Kanzlei "Sie").
- Kurze, klare Sätze. Kein Werbe-Blabla.
- Jeder Text ist FINAL – kein „Beispieltext", kein Lorem, keine Platzhalter.
- Laut-Lese-Regel: Lies jeden Satz innerlich laut. Klingt er nach Broschüre
  statt nach einem Wirt/einer Friseurin, schreib ihn um.
- Verbotene Floskeln (sofort ersetzen): „Willkommen auf unserer Website",
  „Wir freuen uns, Sie begrüßen zu dürfen", „einzigartig", „Genuss pur",
  „Oase der Entspannung", „Tradition trifft Moderne", „Qualität steht bei
  uns an erster Stelle".
- Konkret schlägt blumig: „Apfelstrudel, jeden Tag frisch gebacken" statt
  „köstliche Mehlspeisen-Kreationen" – aber NUR mit belegten Details.

BÜHNE & MASSE (Pflicht – erspart Korrekturrunden)
- Baue für eine feste Bühne von 1280 px Breite. KEIN Element darf darüber
  hinausragen – prüfe das bei jeder Sektion, bevor du sie zeigst.
- Abstände NUR aus dieser Skala: 8 / 12 / 16 / 24 / 40 / 64 / 92 px.
  Nichts dazwischen. (Der Seitenrand ist 40 px, die Inhaltsbreite max. 1280 px.)
- Schriftgrößen NUR aus dieser Skala: 14 / 16 / 20 / 28 / 40 / 56 / 72 px.
- Jede Seite hat genau EINE Hauptüberschrift, darunter saubere Hierarchie.
Diese Skalen sind die Maße des Umsetzungs-Motors – hältst du sie ein, wird
das Design 1:1 übernommen statt umgerechnet.

INTERAKTION NUR ANDEUTEN, NICHT PROGRAMMIEREN
Tabs, Slider, Akkordeons, Filter, Lightbox: Gestalte den sichtbaren Zustand
und beschrifte ihn kurz („Tab-Leiste mit Kategorien Frühstück/Speisen/…").
Baue KEINE eigene Klick-Logik – der Motor bringt die fertige, getestete
Mechanik mit. Jede Minute Fehlersuche an Prototyp-Klicks ist verlorene Zeit.
Formulare: nur die Felder als Liste zeigen (Name, E-Mail, Datum …), nicht
funktional bauen.

KEINE ERFUNDENEN FAKTEN
- Keine erfundenen Zahlen, Jahreszahlen, Mengen oder Auszeichnungen.
- Keine erfundenen Bewertungen oder Kundenstimmen.
- Keine Superlative ("die besten Schnitzel Wiens", "Wiens Nr. 1").
- Nur verwenden, was in den gelieferten Unterlagen wirklich steht.
- Fehlt eine Angabe, lass sie weg – erfinde sie nicht.

SEITEN-SCHNITT
- Baue 4 bis 6 Unterseiten. Typisch: Start, Angebot/Speisekarte/Leistungen,
  Über uns, Galerie, Kontakt.
- KEINE dünnen Seiten. Eine Seite, auf der nur ein Zitat oder drei Kennzahlen
  steht, schadet der Auffindbarkeit bei Google. Kleine Blöcke gehören als
  Abschnitt auf eine größere Seite.
- Die Startseite ist eine echte Landingpage, nicht nur ein Hero-Bild.

INHALTE JE BRANCHE (nur was zutrifft)
- Gastronomie: Speisekarte mit echten Preisen. Bei Speisen sind ALLERGENE
  Pflicht (österreichische Kennzeichnung A–R). Reservierung als eigenes
  Formular neben dem Kontaktformular.
- Beauty/Friseur: Behandlungen mit Dauer und Preis, Vorher/Nachher.
- Handwerk: Referenzprojekte mit Foto, Ablauf, Einsatzgebiet.
- Praxis: Leistungsspektrum, Öffnungszeiten prominent, Team.
- Studio: Kursplan (Wochentage), Preise/Mitgliedschaften, Probestunde.
- KFZ: Leistungen, Terminanfrage, Ablauf.

PREISLISTE ALS DATEN-DATEI (Pflicht, sobald es eine Speisekarte,
Preisliste, Behandlungsliste oder einen Kursplan gibt)
- Gestalte die Karte auf der Seite wie gewohnt – lege die Daten aber
  ZUSÄTZLICH als Datei daten/preisliste.json ab. Der Motor liest sie beim
  Portieren automatisch ein; ohne die Datei muss jede Position von Hand
  abgetippt werden (fehleranfällig).
- Halte dich EXAKT an dieses Schema – keine anderen Schlüssel, alle Preise
  als Text mit Komma und €-Zeichen:

  {
    "kategorien": [
      {
        "id": "mehlspeisen",
        "titel": "Mehlspeisen",
        "gruppen": [
          {
            "titel": "Hausgemacht",
            "positionen": [
              { "name": "Apfelstrudel",
                "beschreibung": "mit Rosinen",
                "preis": "4,80 €",
                "allergene": "A C" },
              { "name": "Topfenstrudel",
                "varianten": [
                  { "groesse": "klein", "preis": "4,20 €" },
                  { "groesse": "groß",  "preis": "5,90 €" }
                ],
                "allergene": "A C G" }
            ]
          }
        ]
      }
    ]
  }

- Erlaubte Schlüssel je Position: name, beschreibung, preis, varianten
  (je Variante: groesse, preis), allergene, dauer (z. B. "60 Min" bei
  Behandlungen/Kursen), tags (z. B. ["veg"]), bild (Dateiname in fotos/).
- Optional auf oberster Ebene: "allergene" als Legende (z. B.
  { "A": "Glutenhaltiges Getreide" }) und "hinweise" (z. B.
  ["Alle Preise inkl. MwSt."]).
- "preis" ODER "varianten" – nie beides. Zeilen ganz ohne Preis nur für
  reine Hinweise ("Alle Gerichte auch als kleine Portion erhältlich.").
- Die "id" jeder Kategorie: nur Kleinbuchstaben, Ziffern, Bindestrich
  (wird zum Tab-Anker), jede id nur einmal.
- Gastronomie: Allergene je Speise sind Pflicht (Kennzeichnung A–R).

FOTOS: DER DATEINAME MUSS DEN INHALT BENENNEN
Jede Bilddatei heißt <slot>--<inhalt>.jpg, z. B. hero--schanigarten.jpg,
galerie--melange.jpg, team--inhaberin.jpg. Ein Dateiname, der lügt (etwa
"eingang.jpg" mit einem Foto der Kaffeedosen), kostet später echte Prüfzeit
und riskiert vertauschte Bilder auf der fertigen Seite.

PFLICHTANGABEN (müssen im Design stehen, sonst bleiben Lücken)
- Vollständige Adresse des Betriebs
- Öffnungszeiten (alle Tage, auch Ruhetage)
- Telefonnummer und E-Mail-Adresse
- Falls es eine alte Website gibt: von dort auch die Impressumsdaten
  (Firmenwortlaut, UID, Firmenbuchnummer) mitnehmen

SPRACHEN
Nur Deutsch, außer der Auftrag sagt ausdrücklich etwas anderes. Englische
Seiten werden NUR gebaut, wenn Zweisprachigkeit beauftragt ist – halte im
Design fest, ob ja oder nein.

WIE SOLL SICH DIE SEITE ANFÜHLEN? (eine Zeile im Design vermerken)
Animations-Stimmung: „aus", „dezent", „lebendig" oder „elegant" – der Motor
setzt das passende Einblende-Verhalten um.

RECHTLICHES
- Kein Cookie-Banner gestalten. Die fertige Seite setzt keine Cookies und
  braucht keinen.
- Impressum und Datenschutz nicht gestalten – die erzeugt der Motor.

WAS DU FREI ENTSCHEIDEST
Layout, Farben, Schriften, Bildsprache, Komposition, Stimmung. Sei mutig –
die Seite soll nicht nach Baukasten aussehen. Um Handy-Ansicht, Ladezeit
und Technik kümmert sich der Motor danach.

SELBSTPRÜFUNG VOR JEDER ABGABE (Pflicht – erst beheben, DANN zeigen)
1. Ragt irgendein Element über die 1280-px-Bühne? → beheben
2. Jeder Abstand aus der Skala (8/12/16/24/40/64/92)? → beheben
3. Alle Texte final, laut gelesen, keine Floskel aus der Verbotsliste?
4. Genau eine Hauptüberschrift je Seite?
5. Pflichtangaben vollständig (Adresse, Zeiten, Telefon, Mail)?
6. Preisliste/Speisekarte vorhanden → liegt daten/preisliste.json bei?
7. Jedes Foto nach dem Muster <slot>--<inhalt>.jpg benannt?
Melde in einem Satz, dass du diese sieben Punkte geprüft und behoben hast.

ABGABE-BLOCK (wenn der Auftraggeber „fertig" sagt)
Gib zum Schluss diesen Block als Klartext aus – er ist die Übergabe an den
Umsetzungs-Motor:
- Seiten: (Liste mit je einem Satz Zweck)
- Farben: (alle Hex-Werte mit Rolle: Hintergrund/Text/Primär/…)
- Schriften: (Familien + verwendete Schnitte)
- Animations-Stimmung: aus/dezent/lebendig/elegant
- Zweisprachig: ja/nein
- Dateien im Projekt: Fotos (Anzahl), preisliste.json ja/nein, PDFs
- Offene Lücken: was fehlt noch vom Kunden (ehrlich!)
```

---

## Für dich: Was du in Claude Design NICHT reparieren musst

Der Prototyp dort ist eine **Reinzeichnung, kein Produkt**. Der Motor übernimmt
keine Pixel-Werte und keine Prototyp-Klicklogik – er baut mit eigenen Maßen und
eigenen, getesteten Bausteinen neu. Deshalb gilt:

- **Ignorieren** (kostet nur Zeit): kleine Überläufe, Prototyp-Klick-Bugs,
  Handy-Ansicht, Ladezeit. Der Motor prüft das später maschinell nach.
- **In Claude Design ausbessern lassen** (schlägt aufs Endprodukt durch):
  Texte, Inhalte, Foto-Auswahl/-Benennung, Seitenaufteilung, Farb-/Schrift-Wahl.
- **Arbeitsweise:** Seite für Seite abnehmen statt alles auf einmal. Bei einem
  Fehler: Screenshot in den Design-Chat + „Führe die Selbstprüfung aus dem
  Briefing durch und behebe, bevor du erneut zeigst."
- Der Satz „Ich habe es visuell geprüft" von Claude Design ist ein Vorsatz,
  keine Garantie – die verlässliche Prüfung macht der Motor (sicht/interaktion).

---

## Danach

Projekt-Link kopieren → im Kundenordner `/port <link>` aufrufen.

Der Port liest das Design aus, entgiftet es (Schriften lokal, Maps-Rahmen raus),
baut echte Unterseiten mit Meta-Tags, macht alles responsiv und meldet am Ende,
welche Lücken noch zu füllen sind.
