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

**Vercel-Realität (im Piloten gelernt, alle drei Punkte prüfen):**
- Zugang: `npx vercel whoami` – falls nicht eingeloggt, den Nutzer durch
  `npx vercel login` führen (Firmen- bzw. eigenes Konto).
- **Plan:** Der Hobby-Plan verbietet JEDE kommerzielle Nutzung – und jedes
  Kundenprojekt ist per Vercel-Definition kommerziell („receiving payment to
  create the site"). Vor dem ersten Deploy sicherstellen, dass das Ziel-Team
  auf **Pro** läuft; sonst den Nutzer darauf hinweisen, bevor irgendetwas
  hochgeht.
- **Team bewusst wählen:** beim Erstanlegen NICHT blind `--yes` – das Projekt
  landet sonst in dem Team, das die CLI zufällig gewählt hat. Vorher
  `npx vercel switch` (bzw. `--scope <team>`).

Vor JEDEM Deploy (Demo wie Live) läuft die **komplette Launch-Prüfung**
(Details: /port-Skill, Etappe 5):
1. `npm run check` grün (Vorprüfung + Build + Prüf-Tor)
2. `npm run sicht` grün (echter Browser: Überlauf, JS-Fehler, kaputte
   Ressourcen; erzeugt Screenshots, Bögen und `pruefung/texte.md`)
3. `npm run interaktion` grün (jeder Bedien-Baustein wird real gefahren)
4. **Mit eigenen Augen:** `pruefung/texte.md` lesen (Rechtschreibung, Ansprache),
   Bögen ansehen (Layout über alle Breiten), Verdachtsfälle im Einzel-Screenshot
5. Beim Live-Gang zusätzlich: `npm run check -- --live` (Platzhalter, offene
   STAND.md-Punkte, Sitemap) und `npm audit --omit=dev` – Funde mit Schweregrad
   high/critical stoppen den Launch (dem Nutzer melden)

---

## A) Demo-Vorschau veröffentlichen (schnell, ohne GitHub)

Für Vorschau-Demos wird **kein** GitHub-Repo angelegt – direkt zu Vercel:

1. Sicherstellen: `content.config.ts` hat `mode: 'demo'` (Demo-Balken, Formular aus, noindex).
2. `npx vercel` ausführen. Beim ersten Mal führt Vercel durch Login + Projekt-Setup
   (Framework „Astro" wird erkannt, Output `dist`).
3. Für die teilbare URL: `npx vercel --prod`.
4. **Marken-Adresse anbinden** (Adress-Stufen, CLAUDE.md Abschnitt 7):
   `npx vercel domains add <kunde>.kanbuk.com <projektname>` – als
   **Projekt-Domain**, nie per `alias set` (ein Alias landet hinter dem
   Vercel-Zugriffsschutz und zeigt Fremden eine Anmeldemaske). Danach die
   Adresse selbst abrufen: Sie muss ohne Login mit HTTP 200 antworten.
5. Die URL an den Nutzer geben. Keine Umgebungsvariablen nötig (Formular ist im Demo aus).

**Welche URL man dem Lead schickt:** Ist im Vercel-Team „Deployment Protection"
aktiv, ist NUR der kurze Alias öffentlich (`https://<projekt>.vercel.app`) – die
längeren Deploy-URLs führen Fremde auf eine Vercel-Anmeldemaske. Deshalb immer
den kurzen Alias herausgeben und **einmal selbst im privaten Fenster öffnen**,
bevor er verschickt wird.

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
4. **Privates GitHub-Repo anlegen + hochladen** (Repo-Name = Ordnername des Kunden).
   Das wird ein **eigenständiges, privates Repo** – kein Fork, kein Branch des
   Templates, keine öffentlich sichtbare Verbindung dorthin:
   ```bash
   git init -b main   # falls noch kein Repo
   gh repo create <kunde-ordnername> --private --source=. --remote=origin --push
   ```
   Das gibt Backup + Verlauf; bei jeder späteren Änderung genügt `git add -A && git commit && git push`.
5. **Live deployen:** `npx vercel --prod`. (Optional im Vercel-Dashboard das GitHub-Repo
   verbinden, dann deployt jeder `git push` automatisch neu.)
6. **Echte Kunden-Domain verbinden:** `npx vercel domains add <kundendomain> <projektname>`.
   Zeigt die Ausgabe nötige DNS-Einträge, dem Nutzer eine einfache
   Klick-Anleitung für den Domain-Anbieter des Kunden mitgeben. Die
   `<kunde>.kanbuk.com`-Abnahme-Adresse kann bleiben oder entfernt werden.
7. Live-URL an den Nutzer.

---

## Cloudflare Pages (Alternative zu Vercel)
Repo verbinden, Build `npm run build`, Output `dist`. Der `X-Robots-Tag`-Header wird dort
automatisch über die generierte `_headers`-Datei gesetzt (mode-abhängig, nichts manuell).
