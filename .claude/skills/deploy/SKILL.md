---
name: deploy
description: >-
  Stellt die Seite online. Zwei Wege: (1) Demo-Vorschau schnell direkt zu Vercel,
  (2) gebuchter Kunde -> privates GitHub-Repo + Live-Schaltung. Auslösen, wenn der
  Nutzer veröffentlichen / online stellen / deployen / live gehen will.
argument-hint: ""
---

# Online stellen

Zuerst klären, welcher Fall vorliegt (kurz nachfragen, wenn unklar):
**A) Demo-Vorschau** für einen Lead, oder **B) gebuchter Kunde geht live**.

Vorab immer: **`npm run check` muss grün sein** (baut selbst und prüft den Standard –
externe Requests, Meta je Seite, Alt-Texte, feste Breiten, mode-Konsistenz).
Beim Live-Gang zusätzlich `npm run check -- --live` (prüft Rechtstexte-Platzhalter
und Sitemap).

---

## A) Demo-Vorschau veröffentlichen (schnell, ohne GitHub)

Für Vorschau-Demos wird **kein** GitHub-Repo angelegt – direkt zu Vercel:

1. Sicherstellen: `content.config.ts` hat `mode: 'demo'` (Demo-Balken, Formular aus, noindex).
2. `npx vercel` ausführen. Beim ersten Mal führt Vercel durch Login + Projekt-Setup
   (Framework „Astro" wird erkannt, Output `dist`).
3. Für die teilbare URL: `npx vercel --prod`.
4. Die URL an den Nutzer geben. Keine Umgebungsvariablen nötig (Formular ist im Demo aus).

---

## B) Gebuchter Kunde – live schalten (mit privatem GitHub-Repo)

Sobald der Auftraggeber die Live-Schaltung freigibt (im Standardablauf: der Kunde
hat gebucht). Vorab STAND.md lesen – dort stehen die offenen Punkte.
GitHub-Zugang prüfen: `gh auth status`; falls nicht eingeloggt, den Nutzer durch
`gh auth login` führen (Firmen-Konto verwenden; Zugänge zu GitHub/Vercel/Resend
bekommt ein neuer Mitarbeiter vom Inhaber).

1. **Live-Konfiguration** in `content.config.ts`:
   - `mode: 'live'` setzen (Formular an, `tel:` verlinkt, Indexierung + Sitemap).
     `vercel.json` und `_headers` erzeugt der nächste Build **automatisch** ohne
     Sperr-Header – dort ist NICHTS von Hand zu ändern.
   - Rechtstexte vollständig und echt (UID/Firmenbuch etc.), echte Bilder eingesetzt,
     alle offenen Punkte in STAND.md abgehakt.
2. **Neu bauen:** `npm run check -- --live` muss grün sein (blockt bei offenen
   STAND.md-Punkten und Platzhaltern).
3. **Formular-Versand:** im Vercel-Dashboard (bzw. `vercel env add`) `RESEND_API_KEY` und
   `CONTACT_FROM` hinterlegen. `npm run build` muss weiter fehlerfrei sein.
4. **Privates GitHub-Repo anlegen + hochladen** (Repo-Name = Ordnername des Kunden):
   ```bash
   git init -b main   # falls noch kein Repo
   gh repo create <kunde-ordnername> --private --source=. --remote=origin --push
   ```
   Das gibt Backup + Verlauf; bei jeder späteren Änderung genügt `git add -A && git commit && git push`.
5. **Live deployen:** `npx vercel --prod`. (Optional im Vercel-Dashboard das GitHub-Repo
   verbinden, dann deployt jeder `git push` automatisch neu.)
6. Live-URL / Domain an den Nutzer.

---

## Cloudflare Pages (Alternative zu Vercel)
Repo verbinden, Build `npm run build`, Output `dist`. Der `X-Robots-Tag`-Header wird dort
automatisch über die generierte `_headers`-Datei gesetzt (mode-abhängig, nichts manuell).
