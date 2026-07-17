/**
 * =============================================================================
 *  PREISLISTE – wandelt daten/preisliste.json in typsicheres daten/preisliste.ts
 * =============================================================================
 *  Claude Design legt Speisekarten, Preislisten und Kurspläne zusätzlich als
 *  Daten-Datei ab: daten/preisliste.json (siehe vorlagen/design-briefing.md).
 *  Dieses Skript prüft die Datei gegen das Motor-Schema (content.config.ts →
 *  Preisliste) und erzeugt daraus die TypeScript-Datei, die content.config.ts
 *  importiert.
 *
 *  Warum nicht von Hand abtippen? Im Piloten waren es 178 Positionen – bei so
 *  vielen Zeilen passieren stille Fehler (verrutschte Position, falsch
 *  geschriebener Schlüssel), die erst der Kunde auf der fertigen Karte bemerkt.
 *  Hier wird jede Position validiert, und am Ende zählt eine Kontrolle nach:
 *  Kategorien/Gruppen/Positionen der Quelle müssen exakt im Ziel ankommen.
 *
 *      npm run preisliste
 *      npm run preisliste -- --quelle daten/preisliste.json --ziel daten/preisliste.ts
 *
 *  Danach in content.config.ts einbinden:
 *      import { PREISLISTE } from './daten/preisliste';
 *      …  preisliste: PREISLISTE,
 *
 *  Rot (Exit 1) = die Quelle entspricht nicht dem Schema. Jede Meldung nennt
 *  den genauen Pfad, z. B.:
 *      kategorien[2].gruppen[0].positionen[5].pries → „meintest du preis?"
 * =============================================================================
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const wert = (name, standard) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : standard;
};

const quelleArg = wert('quelle', 'daten/preisliste.json');
const zielArg = wert('ziel', 'daten/preisliste.ts');
const quelle = isAbsolute(quelleArg) ? quelleArg : join(root, quelleArg);
const ziel = isAbsolute(zielArg) ? zielArg : join(root, zielArg);
// Anzeige-Pfade immer relativ zum Projekt und mit Schrägstrichen – die Meldungen
// sollen auf Windows und Mac identisch aussehen und kopierbar bleiben.
const zeig = (p) => relative(root, p).replace(/\\/g, '/');

// ---------------------------------------------------------------------------
//  1) Quelle lesen
// ---------------------------------------------------------------------------

if (!existsSync(quelle)) {
  console.error(`✗ Quelle nicht gefunden: ${zeig(quelle)}
  Die Datei kommt aus Claude Design (siehe vorlagen/design-briefing.md,
  Abschnitt Preisliste als Daten-Datei). Erst dort exportieren und im Projekt
  ablegen – oder einen anderen Pfad angeben:
      npm run preisliste -- --quelle <pfad/zur/datei.json>`);
  process.exit(1);
}

let daten;
try {
  // BOM entfernen: Windows-Editoren (Notepad & Co.) speichern UTF-8 gern mit
  // Byte-Order-Mark – JSON.parse würde daran mit kryptischer Meldung scheitern.
  daten = JSON.parse(readFileSync(quelle, 'utf8').replace(/^﻿/, ''));
} catch (e) {
  console.error(`✗ ${zeig(quelle)} ist kein gültiges JSON.
  ${e.message}
  Häufige Ursachen: Komma nach dem letzten Eintrag, fehlende Anführungszeichen
  um einen Schlüssel, oder ein Kommentar (JSON kennt keine Kommentare).
  Datei korrigieren, dann erneut: npm run preisliste`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
//  2) Handgeschriebene Schema-Prüfung – exakt die Interfaces aus
//     content.config.ts (Preisliste → PreisKategorie → PreisGruppe →
//     PreisPosition → PreisVariante). Kein zod, keine Abhängigkeit: das
//     Schema ändert sich selten, und so bleiben die Fehlermeldungen deutsch,
//     konkret und mit genauem Pfad.
// ---------------------------------------------------------------------------

const fehler = [];

/** Erlaubte Schlüssel je Ebene – zugleich die Ausgabe-Reihenfolge im Ziel. */
const SCHLUESSEL = {
  preisliste: ['kategorien', 'allergene', 'hinweise', 'pdfDatei'],
  kategorie: ['id', 'titel', 'untertitel', 'bild', 'gruppen'],
  gruppe: ['titel', 'notiz', 'positionen'],
  position: ['name', 'beschreibung', 'preis', 'varianten', 'allergene', 'dauer', 'tags', 'bild'],
  variante: ['groesse', 'preis'],
};

/** Editier-Abstand, um bei Tippfehlern den gemeinten Schlüssel zu erraten. */
function abstand(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[a.length][b.length];
}

/** Unbekannte Schlüssel melden – mit Rat („meintest du …?"), wenn einer nah liegt. */
function pruefeSchluessel(obj, erlaubt, pfad) {
  for (const k of Object.keys(obj)) {
    if (erlaubt.includes(k)) continue;
    const [naechster, dist] = erlaubt
      .map((e) => [e, abstand(k.toLowerCase(), e.toLowerCase())])
      .sort((x, y) => x[1] - y[1])[0];
    const rat = dist <= 2
      ? `meintest du „${naechster}"?`
      : `erlaubt sind: ${erlaubt.join(', ')}`;
    fehler.push(`${pfad}.${k}: unbekannter Schlüssel – ${rat}`);
  }
}

/** Pflicht-Text: vorhanden, String, nicht leer. Liefert true, wenn brauchbar. */
function mussText(v, pfad, beispiel) {
  if (v === undefined) {
    fehler.push(`${pfad}: fehlt (Pflichtfeld)${beispiel ? `, z. B. ${beispiel}` : ''}`);
    return false;
  }
  return darfText(v, pfad, beispiel);
}

/** Optionaler Text: wenn gesetzt, dann String und nicht leer. */
function darfText(v, pfad, beispiel) {
  if (v === undefined) return false;
  if (typeof v === 'number') {
    // Häufigster Fehler bei Preisen: 4.5 statt "4,50 €". Zahlen verlieren die
    // Null am Ende und das €-Zeichen – deshalb verlangt das Schema Text.
    fehler.push(`${pfad}: muss Text sein, keine Zahl – ${v} in Anführungszeichen setzen${beispiel ? `, z. B. ${beispiel}` : ''}`);
    return false;
  }
  if (Array.isArray(v)) {
    fehler.push(`${pfad}: muss Text sein, kein Array${beispiel ? ` – z. B. ${beispiel}` : ''}`);
    return false;
  }
  if (typeof v !== 'string' || v.trim() === '') {
    fehler.push(`${pfad}: muss ein nicht-leerer Text sein${beispiel ? `, z. B. ${beispiel}` : ''}`);
    return false;
  }
  return true;
}

/** Ist v ein einfaches Objekt (kein Array, kein null)? */
const istObjekt = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function pruefeVariante(v, pfad) {
  if (!istObjekt(v)) {
    fehler.push(`${pfad}: muss ein Objekt sein, z. B. { "groesse": "0,33 l", "preis": "3,90 €" }`);
    return;
  }
  pruefeSchluessel(v, SCHLUESSEL.variante, pfad);
  mussText(v.groesse, `${pfad}.groesse`, `"0,33 l" oder "klein"`);
  mussText(v.preis, `${pfad}.preis`, `"3,90 €"`);
}

/** Positionen ganz ohne Preis sind erlaubt (reine Hinweis-Zeilen) – aber sie
 *  werden gezählt und gemeldet, damit ein vergessener Preis auffällt. */
let ohnePreis = 0;

function pruefePosition(p, pfad) {
  if (!istObjekt(p)) {
    fehler.push(`${pfad}: muss ein Objekt sein, z. B. { "name": "…", "preis": "…" }`);
    return;
  }
  pruefeSchluessel(p, SCHLUESSEL.position, pfad);
  mussText(p.name, `${pfad}.name`, `"Wiener Schnitzel"`);
  if (p.beschreibung !== undefined) darfText(p.beschreibung, `${pfad}.beschreibung`);
  if (p.preis !== undefined) darfText(p.preis, `${pfad}.preis`, `"18,90 €"`);
  if (p.allergene !== undefined) darfText(p.allergene, `${pfad}.allergene`, `"A C G"`);
  if (p.dauer !== undefined) darfText(p.dauer, `${pfad}.dauer`, `"60 Min"`);
  if (p.bild !== undefined) darfText(p.bild, `${pfad}.bild`, `"schnitzel.jpg"`);

  if (p.varianten !== undefined) {
    if (!Array.isArray(p.varianten) || p.varianten.length === 0) {
      fehler.push(`${pfad}.varianten: muss eine nicht-leere Liste sein – oder das Feld weglassen und "preis" setzen`);
    } else {
      p.varianten.forEach((v, i) => pruefeVariante(v, `${pfad}.varianten[${i}]`));
    }
  }
  // Das Schema sagt: Einzelpreis ENTFÄLLT, wenn varianten gesetzt ist. Beides
  // zugleich wäre widersprüchlich – welche Zahl gilt dann auf der Karte?
  if (p.preis !== undefined && p.varianten !== undefined) {
    fehler.push(`${pfad}: hat "preis" UND "varianten" – nur eines von beiden (die Varianten ersetzen den Einzelpreis)`);
  }
  if (p.preis === undefined && p.varianten === undefined) ohnePreis++;

  if (p.tags !== undefined) {
    if (!Array.isArray(p.tags)) {
      fehler.push(`${pfad}.tags: muss eine Liste von Texten sein, z. B. ["veg", "scharf"]`);
    } else {
      p.tags.forEach((t, i) => darfText(t, `${pfad}.tags[${i}]`, `"veg"`));
    }
  }
}

function pruefeGruppe(g, pfad) {
  if (!istObjekt(g)) {
    fehler.push(`${pfad}: muss ein Objekt sein ({ "titel": …, "positionen": [ … ] })`);
    return;
  }
  pruefeSchluessel(g, SCHLUESSEL.gruppe, pfad);
  mussText(g.titel, `${pfad}.titel`, `"Klassiker"`);
  if (g.notiz !== undefined) darfText(g.notiz, `${pfad}.notiz`);
  if (!Array.isArray(g.positionen) || g.positionen.length === 0) {
    fehler.push(`${pfad}.positionen: muss eine nicht-leere Liste von Positionen sein`);
  } else {
    g.positionen.forEach((p, i) => pruefePosition(p, `${pfad}.positionen[${i}]`));
  }
}

function pruefeKategorie(k, pfad, gesehen) {
  if (!istObjekt(k)) {
    fehler.push(`${pfad}: muss ein Objekt sein ({ "id": …, "titel": …, "gruppen": [ … ] })`);
    return;
  }
  pruefeSchluessel(k, SCHLUESSEL.kategorie, pfad);
  if (mussText(k.id, `${pfad}.id`, `"fruehstueck"`)) {
    // Die id wird zum Tab-Anker in der URL (#fruehstueck). Umlaute, Leerzeichen
    // oder Großbuchstaben ergäben kaputte bzw. hässliche Anker – lieber hier
    // stoppen und gleich den brauchbaren Vorschlag mitliefern.
    if (!/^[a-z0-9-]+$/.test(k.id)) {
      const vorschlag = k.id.toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      fehler.push(`${pfad}.id: "${k.id}" taugt nicht als Anker (nur a-z, 0-9, Bindestrich) – Vorschlag: "${vorschlag}"`);
    } else if (gesehen.has(k.id)) {
      fehler.push(`${pfad}.id: "${k.id}" ist doppelt vergeben (schon bei ${gesehen.get(k.id)}) – jede Kategorie braucht eine eigene id`);
    } else {
      gesehen.set(k.id, pfad);
    }
  }
  mussText(k.titel, `${pfad}.titel`, `"Frühstück"`);
  if (k.untertitel !== undefined) darfText(k.untertitel, `${pfad}.untertitel`);
  if (k.bild !== undefined) darfText(k.bild, `${pfad}.bild`, `"fruehstueck.jpg"`);
  if (!Array.isArray(k.gruppen) || k.gruppen.length === 0) {
    fehler.push(`${pfad}.gruppen: muss eine nicht-leere Liste von Gruppen sein`);
  } else {
    k.gruppen.forEach((g, i) => pruefeGruppe(g, `${pfad}.gruppen[${i}]`));
  }
}

if (!istObjekt(daten)) {
  const rat = Array.isArray(daten)
    ? 'Die Datei beginnt mit [ – erwartet wird ein Objekt: { "kategorien": [ … ] }'
    : 'Erwartet wird ein Objekt: { "kategorien": [ … ] }';
  fehler.push(`(oberste Ebene): ${rat}`);
} else {
  pruefeSchluessel(daten, SCHLUESSEL.preisliste, 'preisliste');
  if (!Array.isArray(daten.kategorien) || daten.kategorien.length === 0) {
    fehler.push('kategorien: muss eine nicht-leere Liste von Kategorien sein – ohne sie gibt es keine Karte');
  } else {
    const gesehen = new Map();
    daten.kategorien.forEach((k, i) => pruefeKategorie(k, `kategorien[${i}]`, gesehen));
  }
  if (daten.allergene !== undefined) {
    if (!istObjekt(daten.allergene)) {
      fehler.push('allergene: muss ein Objekt Buchstabe → Bezeichnung sein, z. B. { "A": "Glutenhaltiges Getreide" }');
    } else {
      for (const [b, name] of Object.entries(daten.allergene)) darfText(name, `allergene.${b}`);
    }
  }
  if (daten.hinweise !== undefined) {
    if (!Array.isArray(daten.hinweise)) {
      fehler.push('hinweise: muss eine Liste von Texten sein, z. B. ["Alle Preise inkl. MwSt."]');
    } else {
      daten.hinweise.forEach((h, i) => darfText(h, `hinweise[${i}]`));
    }
  }
  if (daten.pdfDatei !== undefined) darfText(daten.pdfDatei, 'pdfDatei', `"speisekarte.pdf"`);
}

if (fehler.length > 0) {
  console.error(`✗ ${zeig(quelle)} entspricht nicht dem Schema (${fehler.length} Fehler):\n`);
  for (const f of fehler) console.error(`  • ${f}`);
  console.error(`
  Das Schema steht in content.config.ts (Preisliste → kategorien → gruppen →
  positionen). Datei korrigieren, dann erneut: npm run preisliste`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
//  3) In Schema-Reihenfolge umbauen und als TypeScript-Literal formatieren
// ---------------------------------------------------------------------------

/** Kopiert nur die erlaubten Schlüssel, in fester Reihenfolge. So sieht jede
 *  erzeugte Datei gleich aus – egal, wie die JSON-Schlüssel sortiert waren. */
function ordne(obj, reihenfolge) {
  const out = {};
  for (const k of reihenfolge) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

const geordnet = ordne(
  {
    ...daten,
    kategorien: daten.kategorien.map((k) => ordne(
      {
        ...k,
        gruppen: k.gruppen.map((g) => ordne(
          {
            ...g,
            positionen: g.positionen.map((p) => ordne(
              {
                ...p,
                varianten: p.varianten?.map((v) => ordne(v, SCHLUESSEL.variante)),
              },
              SCHLUESSEL.position,
            )),
          },
          SCHLUESSEL.gruppe,
        )),
      },
      SCHLUESSEL.kategorie,
    )),
  },
  SCHLUESSEL.preisliste,
);

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const BREITE = 96; // Ziel-Zeilenbreite: kurze Objekte (Varianten) bleiben einzeilig

function tsText(s) {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;
}

/** Formatiert Werte als TS-Literal – einzeilig, solange es in die Zeile passt,
 *  sonst eingerückt über mehrere Zeilen (mit Komma am Ende, wie im Motor üblich). */
function tsLiteral(v, einzug = '') {
  if (typeof v === 'string') return tsText(v);
  if (!istObjekt(v) && !Array.isArray(v)) return String(v); // kommt nach der Prüfung nicht vor
  const innen = einzug + '  ';
  if (Array.isArray(v)) {
    const teile = v.map((t) => tsLiteral(t, innen));
    const einzeilig = `[${teile.join(', ')}]`;
    if (!einzeilig.includes('\n') && einzug.length + einzeilig.length <= BREITE) return einzeilig;
    return `[\n${teile.map((t) => `${innen}${t},`).join('\n')}\n${einzug}]`;
  }
  const teile = Object.entries(v).map(([k, w]) => `${IDENT.test(k) ? k : tsText(k)}: ${tsLiteral(w, innen)}`);
  if (teile.length === 0) return '{}';
  const einzeilig = `{ ${teile.join(', ')} }`;
  if (!einzeilig.includes('\n') && einzug.length + einzeilig.length <= BREITE) return einzeilig;
  return `{\n${teile.map((t) => `${innen}${t},`).join('\n')}\n${einzug}}`;
}

const literal = tsLiteral(geordnet);

// ---------------------------------------------------------------------------
//  4) Zählkontrolle: Quelle gegen das ERZEUGTE Literal
//     Gezählt wird nicht die eigene Zwischenstruktur, sondern der fertige
//     Ausgabetext (zurückgelesen als Objekt) – ginge beim Formatieren eine
//     Position verloren, bliebe das sonst still, bis der Kunde sie vermisst.
// ---------------------------------------------------------------------------

function zaehle(liste) {
  let gruppen = 0;
  let positionen = 0;
  for (const k of liste.kategorien ?? []) {
    for (const g of k.gruppen ?? []) {
      gruppen++;
      positionen += (g.positionen ?? []).length;
    }
  }
  return { kategorien: (liste.kategorien ?? []).length, gruppen, positionen };
}

const inQuelle = zaehle(daten);
const imZiel = zaehle(new Function(`'use strict'; return (${literal});`)());
const stimmt = ['kategorien', 'gruppen', 'positionen'].every((k) => inQuelle[k] === imZiel[k]);

if (!stimmt) {
  console.error(`✗ Zählkontrolle fehlgeschlagen – Quelle und Ziel stimmen nicht überein:
    Kategorien ${inQuelle.kategorien} → ${imZiel.kategorien}, Gruppen ${inQuelle.gruppen} → ${imZiel.gruppen}, Positionen ${inQuelle.positionen} → ${imZiel.positionen}
  Es wurde NICHTS geschrieben. Das ist ein Fehler im Skript (scripts/preisliste.mjs),
  nicht in deinen Daten – bitte melden.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
//  5) Ziel schreiben
// ---------------------------------------------------------------------------

// Import-Pfad relativ zum Ziel berechnen – so stimmt er auch, wenn das Ziel
// (etwa im Selbsttest) nicht in daten/ liegt.
// .js-Endung Pflicht: die Datei wandert mit ins Serverless-Bundle (Node-ESM).
let importPfad = relative(dirname(ziel), join(root, 'content.config.js')).replace(/\\/g, '/');
if (!importPfad.startsWith('.')) importPfad = `./${importPfad}`;

const inhalt = `/**
 * AUTOMATISCH ERZEUGT aus ${zeig(quelle)} – NICHT von Hand bearbeiten.
 * Änderungen dort machen, dann neu erzeugen:  npm run preisliste
 *
 * Stand: ${imZiel.kategorien} Kategorien, ${imZiel.gruppen} Gruppen, ${imZiel.positionen} Positionen.
 */
import type { Preisliste } from '${importPfad}';

export const PREISLISTE: Preisliste = ${literal};
`;

mkdirSync(dirname(ziel), { recursive: true });
writeFileSync(ziel, inhalt, 'utf8');

const preisHinweis = ohnePreis > 0
  ? `\n    davon ohne Preis:  ${ohnePreis}  (erlaubt für reine Hinweis-Zeilen – bitte prüfen, ob da kein Preis fehlt)`
  : '';

console.log(`✓ ${zeig(ziel)} erzeugt aus ${zeig(quelle)}

  Zählkontrolle (Quelle → Ziel):
    Kategorien:  ${inQuelle.kategorien} → ${imZiel.kategorien}
    Gruppen:     ${inQuelle.gruppen} → ${imZiel.gruppen}
    Positionen:  ${inQuelle.positionen} → ${imZiel.positionen}${preisHinweis}

  In content.config.ts einbinden:
    import { PREISLISTE } from './daten/preisliste';
    …
    preisliste: PREISLISTE,`);
