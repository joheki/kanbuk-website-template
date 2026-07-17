/**
 * =============================================================================
 *  BOGEN – Kontaktbögen: viele Bilder auf wenigen Übersichts-Bögen
 * =============================================================================
 *  WARUM: Die Sichtprüfung (CLAUDE.md Abschnitt 9, /port Etappe 5) verlangt,
 *  dass Claude die Bilder ANSIEHT. Zwanzig Einzelbild-Reads fressen aber den
 *  Kontext auf – dieses Skript montiert deshalb alle Bilder zu wenigen Bögen,
 *  sodass die Prüfung mit 1–2 Bild-Reads auskommt statt mit 20.
 *
 *  Zwei Modi:
 *
 *  --fotos    Alle Bilder aus fotos/ (rekursiv) als Raster-Bögen nach
 *             pruefung/bogen-fotos-<n>.png. Unter jeder Kachel eingebrannt:
 *             Dateiname + Breite×Höhe + KB. Lieber mehrere Bögen als kleine
 *             Kacheln – jede Kachel bleibt ~660 px breit (2×3 je Bogen).
 *
 *  --screens  Die Screenshots aus pruefung/ (von "npm run sicht") je SEITE
 *             gruppieren und die Breiten (350/768/1440 …) NEBENEINANDER auf
 *             einen Bogen legen: pruefung/bogen-screens-<seite>[-teilN].png.
 *             Sehr hohe Seiten werden vertikal in Teile geschnitten
 *             (max. ~2400 px Bogenhöhe), jede Spalte trägt eine Kopfzeile.
 *
 *  Verwendung:
 *      npm run bogen -- --fotos
 *      npm run bogen -- --screens
 *      npm run bogen -- --fotos --screens     (beides in einem Lauf)
 *
 *  WICHTIG: Bögen sind Layout-Triage – Textprüfung läuft über
 *  pruefung/texte.md, Text in Logos/Fotos bleibt Screenshot-Pflicht.
 *
 *  Unlesbare Einzelbilder werden übersprungen und gemeldet (kein Abbruch) –
 *  ein kaputtes Foto darf nicht die ganze Prüfung verhindern.
 * =============================================================================
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, relative } from 'node:path';

// Skript-relativ statt process.cwd() – funktioniert damit aus jedem Ordner heraus.
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOTOS = join(WURZEL, 'fotos');
const PRUEFUNG = join(WURZEL, 'pruefung');

const args = process.argv.slice(2);
const modusFotos = args.includes('--fotos');
const modusScreens = args.includes('--screens');

if (!modusFotos && !modusScreens) {
  console.error(`✗ Kein Modus angegeben. So wird das Skript aufgerufen:
    npm run bogen -- --fotos      (alle Bilder aus fotos/ als Übersichts-Bögen)
    npm run bogen -- --screens    (die sicht-Screenshots je Seite nebeneinander)`);
  process.exit(1);
}

// --- Gemeinsame Helfer --------------------------------------------------------

/** XML-Sonderzeichen entschärfen – Dateinamen landen als Text im SVG-Overlay. */
function esc(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c]));
}

/** Lange Dateinamen mittig kürzen, damit die Beschriftung in die Kachel passt. */
function kuerze(name, max = 42) {
  return name.length <= max ? name : `${name.slice(0, Math.ceil(max / 2) - 1)}…${name.slice(-(Math.floor(max / 2) - 1))}`;
}

/** Alle Dateien eines Ordners rekursiv (wie in lib/dist-server.mjs). */
function alleDateien(dir, treffer = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) alleDateien(p, treffer);
    else treffer.push(p);
  }
  return treffer;
}

/**
 * Bild-Metadaten lesen – liefert null statt zu werfen. Ein einzelnes kaputtes
 * Bild (0 Byte, abgebrochener Download …) wird gemeldet und übersprungen,
 * bricht aber nie den ganzen Bogen ab.
 */
async function lesbar(datei) {
  try {
    const meta = await sharp(datei).metadata();
    if (!meta.width || !meta.height) throw new Error('keine Bildmaße lesbar');
    return { breite: meta.width, hoehe: meta.height, kb: Math.round(statSync(datei).size / 1024) };
  } catch (e) {
    console.warn(`  ⚠ übersprungen (unlesbar): ${relative(WURZEL, datei)} – ${e.message.split('\n')[0]}`);
    return null;
  }
}

/** Alte Bögen desselben Modus wegräumen – veraltete Bögen führen die Prüfung in die Irre. */
function raeumeAlteBoegen(praefix) {
  if (!existsSync(PRUEFUNG)) return;
  for (const f of readdirSync(PRUEFUNG)) {
    if (f.startsWith(praefix) && f.endsWith('.png')) rmSync(join(PRUEFUNG, f), { force: true });
  }
}

const BILD_ENDUNGEN = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const erzeugteBoegen = [];

// --- Modus 1: fotos/ als Raster-Bögen ------------------------------------------
//
// Layout: 2 Spalten × 3 Zeilen je Bogen bei 1400 px Bogenbreite. Das ergibt
// ~660 px Kachelbreite – deutlich über der 450-px-Untergrenze, ab der Details
// (Bildschärfe, Motivqualität) noch beurteilbar sind. Reichen 6 Kacheln nicht,
// entstehen MEHRERE Bögen; geschrumpft wird nie.
async function bogenFotos() {
  if (!existsSync(FOTOS)) {
    console.error(`✗ Der Ordner fotos/ fehlt. Fotos dort ablegen (oder "npm run platzhalter"
  laufen lassen), dann erneut: npm run bogen -- --fotos`);
    process.exit(1);
  }

  const bilder = alleDateien(FOTOS)
    .filter((f) => BILD_ENDUNGEN.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'de'));

  if (bilder.length === 0) {
    console.error(`✗ Keine Bilder in fotos/ gefunden (gesucht: ${[...BILD_ENDUNGEN].join(', ')}).
  Fotos nach fotos/ legen oder Platzhalter erzeugen: npm run platzhalter`);
    process.exit(1);
  }

  // Kachel-Geometrie: Bild-Bereich + Beschriftungsstreifen darunter.
  const SPALTEN = 2;
  const ZEILEN = 3;
  const RAND = 24;
  const LUECKE = 24;
  const KACHEL_B = 664;      // (1400 − 2×24 − 24) / 2 → Bogenbreite exakt 1400 px
  const BILD_H = 440;        // einheitliche Bildhöhe, Seitenverhältnis via contain
  const TEXT_H = 44;         // Streifen für die eingebrannte Beschriftung
  const KACHEL_H = BILD_H + TEXT_H;
  const BOGEN_B = RAND * 2 + SPALTEN * KACHEL_B + (SPALTEN - 1) * LUECKE;

  // Erst alle Bilder vorbereiten (kaputte fallen hier raus), dann in 6er-Gruppen montieren.
  const kacheln = [];
  for (const datei of bilder) {
    const info = await lesbar(datei);
    if (!info) continue;
    try {
      // .rotate() ohne Argument = EXIF-Ausrichtung anwenden – Handyfotos liegen
      // sonst quer. contain erhält das Seitenverhältnis auf einheitlicher Höhe.
      const puffer = await sharp(datei)
        .rotate()
        .resize(KACHEL_B, BILD_H, { fit: 'contain', background: '#ffffff' })
        .png()
        .toBuffer();
      kacheln.push({ puffer, name: relative(FOTOS, datei).replace(/\\/g, '/'), ...info });
    } catch (e) {
      console.warn(`  ⚠ übersprungen (nicht verarbeitbar): ${relative(WURZEL, datei)} – ${e.message.split('\n')[0]}`);
    }
  }

  if (kacheln.length === 0) {
    console.error(`✗ Kein einziges Bild aus fotos/ war lesbar – alle wurden übersprungen (siehe Warnungen).
  Die Dateien prüfen/ersetzen, dann erneut: npm run bogen -- --fotos`);
    process.exit(1);
  }

  mkdirSync(PRUEFUNG, { recursive: true });
  raeumeAlteBoegen('bogen-fotos-');

  const jeBogen = SPALTEN * ZEILEN;
  const anzahlBoegen = Math.ceil(kacheln.length / jeBogen);

  for (let b = 0; b < anzahlBoegen; b++) {
    const gruppe = kacheln.slice(b * jeBogen, (b + 1) * jeBogen);
    const zeilen = Math.ceil(gruppe.length / SPALTEN);
    const bogenH = RAND * 2 + zeilen * KACHEL_H + (zeilen - 1) * LUECKE;

    const ebenen = [];
    let svg = '';
    gruppe.forEach((k, i) => {
      const x = RAND + (i % SPALTEN) * (KACHEL_B + LUECKE);
      const y = RAND + Math.floor(i / SPALTEN) * (KACHEL_H + LUECKE);
      ebenen.push({ input: k.puffer, left: x, top: y });
      // Rahmen um die ganze Kachel + Beschriftung im Streifen darunter.
      // Die Maße stehen IM Bild, weil der Bogen allein gelesen wird – ohne
      // Beschriftung wüsste niemand, welche Kachel welche Datei ist.
      svg += `
        <rect x="${x - 1}" y="${y - 1}" width="${KACHEL_B + 2}" height="${KACHEL_H + 2}" fill="none" stroke="#9ca3af" stroke-width="1"/>
        <rect x="${x}" y="${y + BILD_H}" width="${KACHEL_B}" height="${TEXT_H}" fill="#1f2937"/>
        <text x="${x + KACHEL_B / 2}" y="${y + BILD_H + 28}" text-anchor="middle"
              font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#ffffff">${esc(kuerze(k.name))} · ${k.breite}×${k.hoehe} · ${k.kb} KB</text>`;
    });

    const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${BOGEN_B}" height="${bogenH}">${svg}</svg>`);
    const ziel = join(PRUEFUNG, `bogen-fotos-${b + 1}.png`);
    await sharp({ create: { width: BOGEN_B, height: bogenH, channels: 3, background: '#f3f4f6' } })
      .composite([...ebenen, { input: overlay, left: 0, top: 0 }])
      .png()
      .toFile(ziel);

    erzeugteBoegen.push(relative(WURZEL, ziel).replace(/\\/g, '/'));
    console.log(`  ✓ pruefung/bogen-fotos-${b + 1}.png (${gruppe.length} Bild(er): ${gruppe.map((k) => k.name).join(', ')})`);
  }
}

// --- Modus 2: sicht-Screenshots je Seite nebeneinander --------------------------
//
// Die Screenshots heißen <seite>-<breite>px.png (siehe sicht.mjs). Alle Breiten
// EINER Seite kommen nebeneinander auf einen Bogen – so springt ein Layout-Bruch
// (Handy einspaltig? Tablet-Grid?) im direkten Vergleich sofort ins Auge.
// Native Pixel, nichts wird verkleinert: sehr hohe Seiten werden stattdessen
// vertikal in Teile geschnitten (Teil 2 setzt dort fort, wo Teil 1 endet).
async function bogenScreens() {
  if (!existsSync(PRUEFUNG)) {
    console.error(`✗ Der Ordner pruefung/ fehlt – es gibt noch keine Screenshots.
  Zuerst "npm run sicht" laufen lassen, dann: npm run bogen -- --screens`);
    process.exit(1);
  }

  // Gruppieren: start-350px.png → Seite "start", Breite 350. Eigene Bögen
  // (bogen-*) und Temporäres (tmp-*) sind keine Eingaben.
  const gruppen = new Map();
  for (const f of readdirSync(PRUEFUNG)) {
    if (f.startsWith('bogen-')) continue;
    const m = /^(.+)-(\d+)px\.png$/.exec(f);
    if (!m) continue;
    if (!gruppen.has(m[1])) gruppen.set(m[1], []);
    gruppen.get(m[1]).push({ datei: join(PRUEFUNG, f), breite: Number(m[2]) });
  }

  if (gruppen.size === 0) {
    console.error(`✗ Keine Screenshots in pruefung/ gefunden (erwartet: <seite>-<breite>px.png).
  Zuerst "npm run sicht" laufen lassen, dann: npm run bogen -- --screens`);
    process.exit(1);
  }

  raeumeAlteBoegen('bogen-screens-');

  const RAND = 20;
  const LUECKE = 20;
  const KOPF = 48;                              // Kopfzeile je Spalte: die Breite
  const MAX_BOGEN_H = 2400;                     // höher liest kein Bild-Read sinnvoll
  const SCHNITT = MAX_BOGEN_H - RAND * 2 - KOPF; // Inhaltshöhe je Teil

  for (const [seite, roh] of [...gruppen.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'))) {
    // Schmal → breit sortiert, kaputte Einzel-Screenshots fliegen raus.
    const spalten = [];
    for (const s of roh.sort((a, b) => a.breite - b.breite)) {
      const info = await lesbar(s.datei);
      if (info) spalten.push({ ...s, hoehe: info.hoehe, bildBreite: info.breite });
    }
    if (spalten.length === 0) {
      console.warn(`  ⚠ Seite "${seite}" übersprungen – kein Screenshot war lesbar.`);
      continue;
    }

    // Dateiname säubern: der sicht-Name von "/datenschutz/" endet auf "-".
    const seiteName = seite.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+$/, '') || 'seite';
    const bogenB = RAND * 2 + spalten.reduce((s, sp) => s + sp.bildBreite, 0) + (spalten.length - 1) * LUECKE;
    const teile = Math.ceil(Math.max(...spalten.map((s) => s.hoehe)) / SCHNITT);

    for (let t = 0; t < teile; t++) {
      const oben = t * SCHNITT;
      const ebenen = [];
      let svg = '';
      let x = RAND;
      let inhaltH = 0;

      for (const sp of spalten) {
        const rest = sp.hoehe - oben;
        const kopfText = `${sp.breite} px${teile > 1 ? ` · Teil ${t + 1}/${teile} (ab ${oben} px)` : ''}`;
        svg += `
          <rect x="${x}" y="${RAND}" width="${sp.bildBreite}" height="${KOPF - 8}" fill="#1f2937"/>
          <text x="${x + sp.bildBreite / 2}" y="${RAND + 27}" text-anchor="middle"
                font-family="Segoe UI, Arial, sans-serif" font-size="19" fill="#ffffff">${esc(kopfText)}</text>`;

        if (rest > 0) {
          const stueckH = Math.min(SCHNITT, rest);
          // extract statt resize: die Prüfung braucht native Pixel, jede
          // Verkleinerung würde 16-px-Fließtext unlesbar machen.
          const puffer = await sharp(sp.datei)
            .extract({ left: 0, top: oben, width: sp.bildBreite, height: stueckH })
            .png()
            .toBuffer();
          ebenen.push({ input: puffer, left: x, top: RAND + KOPF });
          inhaltH = Math.max(inhaltH, stueckH);
        } else {
          // Diese Breite ist schon zu Ende (kürzere Seite) – klar sagen statt
          // eine leere Fläche zu zeigen, die wie ein Renderfehler aussähe.
          svg += `
            <text x="${x + sp.bildBreite / 2}" y="${RAND + KOPF + 40}" text-anchor="middle"
                  font-family="Segoe UI, Arial, sans-serif" font-size="17" fill="#6b7280">(Seite endet bei ${sp.hoehe} px – siehe Teil ${Math.ceil(sp.hoehe / SCHNITT)})</text>`;
        }
        x += sp.bildBreite + LUECKE;
      }

      const bogenH = RAND * 2 + KOPF + Math.max(inhaltH, 80);
      const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${bogenB}" height="${bogenH}">${svg}</svg>`);
      const zielName = `bogen-screens-${seiteName}${teile > 1 ? `-teil${t + 1}` : ''}.png`;
      await sharp({ create: { width: bogenB, height: bogenH, channels: 3, background: '#f3f4f6' } })
        .composite([...ebenen, { input: overlay, left: 0, top: 0 }])
        .png()
        .toFile(join(PRUEFUNG, zielName));

      erzeugteBoegen.push(`pruefung/${zielName}`);
      console.log(`  ✓ pruefung/${zielName} (${spalten.length} Spalte(n): ${spalten.map((s) => s.breite).join('/')} px)`);
    }
  }
}

// --- Ablauf ---------------------------------------------------------------------
if (modusFotos) {
  console.log('Kontaktbogen fotos/: alle Bilder als Raster-Übersicht\n');
  await bogenFotos();
  console.log('');
}
if (modusScreens) {
  console.log('Kontaktbogen Screenshots: je Seite alle Breiten nebeneinander\n');
  await bogenScreens();
  console.log('');
}

console.log(`✓ ${erzeugteBoegen.length} Bogen/Bögen erzeugt – jetzt mit Read ANSEHEN:
${erzeugteBoegen.map((b) => `    ${b}`).join('\n')}

  Bögen sind Layout-Triage – Textprüfung läuft über pruefung/texte.md,
  Text in Logos/Fotos bleibt Screenshot-Pflicht.`);
