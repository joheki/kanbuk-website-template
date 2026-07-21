# Kanbuk Website-Template

**Der technische Motor für Websites Wiener Kleinbetriebe.**

Dieses Repo ist **kein Design-Template**. Es legt fest, *wie* eine Seite gebaut sein
muss – Meta-Tags, Responsiveness, Sicherheit, DSGVO, Ladezeit, Recht. Es legt **nicht**
fest, wie sie aussieht.

**Das Design kommt aus [Claude Design](https://claude.ai/design).** Dort entsteht die
komplette Website visuell, mit allen Unterseiten und echten Inhalten. Der Motor setzt
sie technisch sauber um.

> Der Motor liefert die Mechanik, das Design den Lack.

Technik: **Astro**, rein statischer Build. Kein CMS, keine Datenbank, keine Cookies,
kein Tracking, kein Cookie-Banner.

---

## Der Ablauf

### 1 · Design bauen — *du, in Claude Design*

Neues Projekt anlegen, den Text aus [`vorlagen/design-briefing.md`](vorlagen/design-briefing.md)
einfügen, Lead-Daten dazugeben (Website-Link, Fotos, Speisekarte, Öffnungszeiten).
Gestalten, bis es passt. **Projekt-Link kopieren.**

Um Technik kümmerst du dich dort nicht – feste Pixel, Desktop-Layout, CDN-Schriften
sind egal. Das wird beim Portieren umgebaut.

> **Die Demo kann schon Schritt 1 sein:** Das Claude-Design-Projekt lässt sich
> dem Kunden direkt als Verkaufs-Demo zeigen (Vollbild-Vorschau, vor Ort oder
> per Bildschirmteilung) – 5–10 min Aufwand statt einer Stunde. Schritt 2 folgt
> dann erst bei Kauf oder ernsthaftem Interesse. **Schickbarer Link ohne Port:**
> In Claude Design „Export → Project archive" (gratis, sofort, alle Seiten),
> dann `npm run demo -- --datei "<Archiv.zip>" --kunde "<Name>"` – verpackt das
> Design als echte Mehrseiten-Demo (Kanbuk-Leiste, unsichtbar für Google,
> Handy-Hinweis, Sicht-Check je Seite) und macht sie per Vercel teilbar.
> (Der „Standalone HTML"-Export geht auch, kostet aber Claude-Kontingent.) Funktioniert im Template-Ordner UND in jedem
> frischen Kundenordner (sogar ohne `npm install`) – die Demo landet immer
> außerhalb in `kanbuk-demos/`, das Projekt bleibt sauber. Wer lieber gleich die echte Web-Vorschau
> will, macht Schritt 2 sofort. Alles ist vorgesehen.

### 2 · Technisch umsetzen — *Claude Code, ~30–45 min*

```bash
# Das Template liegt im GitHub-Konto joheki – zieht es je um, nur diese Zeile anpassen.
npx degit joheki/kanbuk-website-template kanbuk-kunden/<kunde>
cd kanbuk-kunden/<kunde>
npm install
```

**Ohne Terminal geht es auch:** leeren Kundenordner in VS Code öffnen, Claude Code
starten und schreiben: „Hol dir das Template von joheki/kanbuk-website-template und
setze dann dieses Design um: <Claude-Design-Link>" – Claude erledigt den Rest und
stellt am Anfang einmal gebündelt die nötigen Fragen (Kundendaten, Zusätze).

Dann (bzw. im Terminal-Weg: Ordner in VS Code öffnen, Claude Code starten):

```
/port https://claude.ai/design/p/<projekt-id>
```

Ergebnis: **die fertige Seite** – echte Unterseiten, vollständig responsiv, SEO,
sicher, cookiefrei. Nur ohne Zugänge. Dann `/deploy` für die Vorschau-Domain.

> **Gilt für jedes Geschäftsmodell:** `demo`/`live` sind technische Modi, keine
> Vertriebsstufen. Beim Demo-Verkauf ist die Vorschau die Verkaufs-Demo; beim
> Direktkauf ist sie die **Abnahme-Vorschau** vor der Freigabe. Und weil jedes
> Kundenprojekt ein eigenständiges Repo ist, lässt es sich bei einem Vollkauf
> komplett übertragen (Repo, Hosting, Domain auf Konten des Kunden).
> Grenzen des Motors: kein CMS/Selbst-Bearbeiten, Shop/Buchung/Blog baut der
> jeweilige Projekt-Chat bei Bedarf auf dem Motor auf (CLAUDE.md 7a).

### 3 · Kunde bucht (bzw. gibt frei) — *~15 min*

`STAND.md` im Kundenordner öffnen – dort steht, was noch offen ist. Dann nur noch
drei Dinge, kein Basteln an Technik:

1. `mode: 'live'` in `content.config.ts` (Header/Sitemap stellt der Build automatisch um)
2. Echte **Rechtstexte** (UID, Firmenbuch – Impressumspflicht) + offene Punkte aus `STAND.md`
3. `RESEND_API_KEY` + `CONTACT_FROM` setzen, Domain verbinden

```bash
npm run check -- --live   # muss grün sein
npx vercel --prod
```

---

## Was der Motor mitbringt

| Bereich | Inhalt |
| --- | --- |
| **SEO** | Meta je Seite (Titel, Description, Canonical, OG), JSON-LD `LocalBusiness` mit maschinenlesbaren Öffnungszeiten, Sitemap, `hreflang` |
| **Responsiveness** | Fluide Token-Skala (350–1440 px) – jeder Pixelwert aus dem Design wird zum Token |
| **Verhalten** | Tabs, Filter, Slider, Akkordeon, Lightbox, Mobilmenü, Vorher/Nachher – branchenneutral, unstyled |
| **Formulare** | Beliebig viele (Kontakt, Reservierung, Termin, Angebot) aus der Config, Honeypot, Resend |
| **Recht** | Impressum + Datenschutz (passen sich automatisch an), cookiefrei ab Werk |
| **Ausbau** | Pixel/Tracking und Maps/YouTube sind **vorbereitet** – siehe unten |
| **Weiterleitungen** | Alte Adressen → neue, rettet das Google-Ranking bei Vorgänger-Websites |
| **demo/live** | Ein Wort schaltet Balken, Formular, `tel:`, Indexierung, Sitemap, Header |
| **Prüf-Tor** | `npm run check` lässt nichts durch, was den Standard unterschreitet |

Verbindliche Regeln: **[CLAUDE.md](CLAUDE.md)** – inklusive Umrechnungstabelle
(Design-Pixel → Token) und Portier-Rezept.

---

## Später ausbauen (Pixel, Maps, …)

**Ab Werk ist die Seite cookiefrei und braucht keinen Banner.** Das ist Absicht: kein
Banner heißt bessere Bedienung und mehr Anfragen.

Will ein Kunde später **Meta-Pixel, Google Ads oder Analytics**, ist das ein
Config-Eintrag – kein Neubau. Der Motor bringt die Anschlüsse fertig mit:

```ts
dienste: [
  { id: 'meta-pixel', name: 'Meta-Pixel', anbieter: 'Meta Platforms Ireland Ltd.',
    kategorie: 'marketing', zweck: 'Messung von Werbeerfolgen',
    datenschutzUrl: 'https://www.facebook.com/privacy/policy/',
    setztCookies: true, skript: '…' },
],
```

Automatisch passiert dann: Einwilligungs-Banner erscheint, das Skript bleibt **bis zum
Ja des Besuchers geparkt** (Opt-in, DSGVO), und die Datenschutzerklärung nennt den
Dienst samt Widerruf. Das Design des Banners kommt aus Claude Design.

**Google Maps / YouTube / Instagram:** kein fester `<iframe>` (der lädt sofort und setzt
Cookies). Zwei Wege: statisches Kartenbild + Link (`npm run karte`, der Standard) oder
die **2-Klick-Einbettung** `<Einbettung>` – der Rahmen entsteht erst beim Klick.

Details: [CLAUDE.md, Abschnitt 7a](CLAUDE.md).

---

## Befehle

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Vorschau lokal (http://localhost:4321) |
| `npm run check` | **Das Prüf-Tor** – baut und prüft den Standard |
| `npm run check -- --live` | zusätzlich die Live-Pflichten |
| `npm run schrift -- --familie "<Name>"` | Google-Schrift lokal einbetten |
| `npm run karte -- --adresse "…"` | Statisches Kartenbild statt Maps-Rahmen |
| `npm run og -- --bild fotos/hero.jpg` | WhatsApp-/Social-Vorschaubild aus einem echten Foto |
| `npm run sicht` | **Sichtprüfung im echten Browser**: Screenshots 350/768/1440, Überlauf-/Fehler-Messung, Text-Dump + Bögen |
| `npm run interaktion` | Fährt jeden Bedien-Baustein real (Tabs, Menü, Akkordeon …) – was klickbar ist, muss klicken |
| `npm run bogen -- --fotos` | Kontaktbögen: alle Fotos/Screenshots auf wenigen Übersichtsbildern |
| `npm run holen -- --url <…> --ziel fotos/x.jpg` | Datei herunterladen UND auf Unversehrtheit prüfen |
| `npm run preisliste` | `daten/preisliste.json` (aus Claude Design) validieren → typsichere `daten/preisliste.ts` |
| `npm run demo -- --datei <archiv.zip> --kunde "…"` | Design-Projekt-Archiv als schickbare Mehrseiten-Demo hosten (ohne Port) |
| `npm run sicht` | Sichtprüfung im echten Browser: Screenshots aller Seiten bei 350/768/1440 px + Überlauf-/Fehler-Messung |
| `npm run platzhalter -- --name "…"` | Textlose Platzhalter + OG-Bild + Favicon (nach `fotos/`) |
| `npm run stock -- --thema "…"` | Stock-Platzhalter (braucht `PEXELS_API_KEY` in `.env`) |

---

## Aufbau

```
content.config.ts        Motor-Schnittstelle: Betrieb, Design-Tokens, Seiten, Recht
STAND.md                 Gedächtnis des Projekts: Phase, Lücken-Inventar, Verlauf
fotos/                   >>> HIER kommen alle Bilder rein <<<  (siehe fotos/README.md)
src/
  styles/global.css      Token-Fundament (fluide Skala) – KEINE Design-Entscheidungen
  styles/fonts.css       lokale Schriften (pro Kunde via npm run schrift)
  lib/verhalten/         Verhaltens-Bausteine: Mechanik ohne Aussehen
  lib/theme.ts           Design-Tokens → CSS-Variablen (die Nahtstelle)
  layouts/BaseLayout     Meta, JSON-LD, hreflang, demo/live
  components/            Motor: DemoBar, Navigation, Formular
                         + die portierten Sektionen des Kunden
  pages/                 eine Datei je Unterseite
api/                    Formular-Endpunkt (Vercel)
scripts/                 check, schrift, karte, platzhalter, stock
vorlagen/                Design-Briefing für Claude Design
```

**Die Referenz-Seite** (`src/pages/index.astro`) zeigt die Bauweise und macht den
Standard vorführbar. Beim Kunden wird sie ersetzt.

---

## Deploy

**Vercel**: `npx vercel` für die Vorschau, `npx vercel --prod` für live.
`vercel.json` erzeugt der Build **automatisch** aus dem `mode` – dort ist nichts
von Hand zu ändern. Marken-Adresse anbinden mit
`npx vercel domains add <kunde>.kanbuk.com <projekt>` (Projekt-Domain, nie `alias set`).

Der Motor zielt bewusst **nur auf Vercel**. Frühere Unterstützung für Cloudflare
Pages / Netlify (zweiter Formular-Endpunkt, `_headers`, `_redirects`) ist
entfernt: nie genutzt, aber mitzupflegen – und dabei still kaputtgegangen.
Bei einem Host-Wechsel aus der Versionsgeschichte zurückholen.

Ein Klon ist **eigenständig – technisch garantiert**: `degit` kopiert nur Dateien,
ohne Git-Historie und ohne Verweis zurück. Ein Kundenprojekt ist also **kein Fork und
kein Branch** des Templates – auf GitHub ist nirgends sichtbar, dass es aus diesem
Template entstanden ist. Das private Kunden-Repo (entsteht bei Buchung über `/deploy`)
ist ein komplett unabhängiges Repository. Es gibt auch keine Updates vom Template
zurück in Kundenprojekte – das Template ist nur der Startpunkt.

---

## Besucherzahlen – ohne Cookies, ohne Banner

Die Frage kommt von jedem Kunden. Die Antwort des Motors: **Vercel Web Analytics** –
cookielos, läuft über die eigene Domain, kein Banner nötig. Einrichten in 2 Minuten:

1. Im Vercel-Dashboard des Projekts: **Analytics → Enable**
2. In `content.config.ts`: `besucherzaehlung: 'vercel'` setzen (ergänzt automatisch
   den passenden Absatz in der Datenschutzerklärung), neu bauen und deployen

Die Zahlen sieht der Betreiber im Vercel-Dashboard. Für mehr (Kampagnen, Pixel)
gibt es die Ausbau-Anschlüsse mit Einwilligung – siehe oben.

---

## Wenn die Firma umbenennt (White-Label)

Das Kanbuk-Branding steckt an genau diesen Stellen – bei einer Umbenennung nur
diese anpassen:

| Stelle | Was |
| --- | --- |
| `src/components/DemoBar.astro` | Wortmarke, Zeichen (SVG) und Markenfarben des Vorschau-Balkens |
| `scripts/check.mjs` | `istTemplate`-Vergleich: `pkg.name === 'kanbuk-website-template'` |
| `package.json` | Template-Name + Konvention `kanbuk-<kunde>` beim Port |
| `src/lib/verhalten/einwilligung.ts` | localStorage-Schlüssel `kanbuk-einwilligung` |
| `astro.config.ts` / `scripts/karte.mjs` | interner Integrationsname / User-Agent (rein technisch) |
