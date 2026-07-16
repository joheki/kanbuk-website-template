---
description: Stellt die Seite online – Demo-Vorschau oder Live-Schaltung.
---

Führe den Veröffentlichungs-Ablauf aus (siehe `.claude/skills/deploy/SKILL.md`).
Zwei Fälle: (A) Demo-Vorschau → `npx vercel`, keine Umgebungsvariablen nötig,
Demo-URL ausgeben. (B) Live-Schaltung → STAND.md prüfen, `mode: 'live'`,
`npm run check -- --live`, Schlüssel + Domain, privates GitHub-Repo, `npx vercel --prod`.
