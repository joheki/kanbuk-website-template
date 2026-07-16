# fotos/ – hier kommen die Bilder rein

**Das ist der einzige Ordner, in den du Fotos legen musst.** Alles andere macht
Claude Code.

---

## So geht's

1. Fotos hier hineinkopieren (JPG, PNG oder WebP).
2. Claude Code sagen, welches Foto wohin gehört – **in normaler Sprache**:
   > „Das Bild `schanigarten.jpg` soll der Hero auf der Startseite sein,
   > die vier `essen-*.jpg` in die Galerie."
3. Fertig. Claude Code trägt sie ein, Astro optimiert sie beim Bauen automatisch
   (moderne Formate, passende Größen fürs Handy).

**Du musst nichts umbenennen und nichts sortieren.** Unterordner sind erlaubt –
Claude Code findet die Fotos trotzdem.

---

## Was gute Fotos ausmacht

| | |
| --- | --- |
| **Hero-Bild** (das große oben) | quer, mindestens 1600 px breit |
| **Galerie / Inhalt** | mindestens 1000 px breit |
| **Team / Portraits** | hochkant ist völlig in Ordnung |
| **Dateigröße** | egal – große Dateien werden automatisch verkleinert |

Lieber ein großes Originalfoto als ein kleines: Verkleinern kann der Motor,
vergrößern nicht.

---

## Wenn du (noch) keine Fotos hast

Dann bekommt die Vorschau Platzhalter, und Claude Code schreibt dir in den
Abschlussbericht genau, **welche Bilder noch echt werden müssen**. Zwei Wege:

- **Stimmungsbilder aus einer Stock-Datenbank** (sieht realistisch aus, ist aber
  nicht der echte Betrieb): `npm run stock -- --thema "wiener beisl"`
- **Neutrale Farbflächen** in den Markenfarben: `npm run platzhalter`

Für die **Vorschau** ist beides in Ordnung – der Kunde sieht, wie es aussehen wird.
**Vor dem Live-Gang müssen echte Fotos rein.** Stock-Bilder auf einer echten
Betriebs-Website wirken unecht und schaden mehr, als sie nützen.

---

## Woher kommen die Bilder normalerweise?

1. **Aus Claude Design** – wenn du sie dort schon eingebaut hast, holt Claude Code
   sie beim Portieren mit.
2. **Von der bestehenden Website des Betriebs** – Claude Code lädt sie automatisch
   herunter, wenn es eine gibt.
3. **Von dir, hier in diesen Ordner** – wenn dir der Kunde Fotos schickt oder du
   selbst welche gemacht hast.

Die Kartenbilder aus `npm run karte` landen ebenfalls hier.
