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

RECHTLICHES
- Kein Cookie-Banner gestalten. Die fertige Seite setzt keine Cookies und
  braucht keinen.
- Impressum und Datenschutz nicht gestalten – die erzeugt der Motor.

WAS DU FREI ENTSCHEIDEST
Layout, Farben, Schriften, Bildsprache, Komposition, Stimmung. Sei mutig –
die Seite soll nicht nach Baukasten aussehen. Um Handy-Ansicht, Ladezeit
und Technik kümmert sich der Motor danach.
```

---

## Danach

Projekt-Link kopieren → im Kundenordner `/port <link>` aufrufen.

Der Port liest das Design aus, entgiftet es (Schriften lokal, Maps-Rahmen raus),
baut echte Unterseiten mit Meta-Tags, macht alles responsiv und meldet am Ende,
welche Lücken noch zu füllen sind.
