/**
 * =============================================================================
 *  INTERAKTION – der automatische Bedien-Test der Verhaltens-Bausteine
 * =============================================================================
 *  Ein Screenshot zeigt, WIE die Seite aussieht (npm run sicht) – aber nicht,
 *  OB sie sich bedienen lässt. Dieses Skript fährt deshalb jede gebaute Seite
 *  im echten Browser bei 350 und 1440 px und BEDIENT alles, was der Motor an
 *  Verhalten mitbringt:
 *
 *   • Tabs        – zweiten Tab klicken: wandert aria-selected, wechselt das Panel?
 *   • Filter      – Kategorie klicken: stimmt die Zahl der sichtbaren Elemente?
 *   • Mobilmenü   – öffnen, mit Escape schließen (nur in der Handy-Ansicht)
 *   • Akkordeon   – Eintrag aufklappen; „exklusiv" darf nur einen offen lassen
 *   • Lightbox    – Bild klicken: Dialog offen? Escape schließt?
 *   • Vergleich   – Regler auf 25: sitzt die CSS-Variable --vergleich-pos?
 *   • Slider      – Vor-Knopf: wandert der aktive Punkt bzw. die Spur?
 *   • Formular    – demo-Modus MUSS den Hinweis zeigen statt eines scharfen
 *                   Formulars; ein Live-Formular wird nur strukturell geprüft
 *                   (Absende-Knopf + Status-Element) und NIE abgesendet.
 *
 *  Die Bausteine sind über data-Attribute standardisiert (src/lib/verhalten/) –
 *  deshalb testet EIN Skript jede Kundenseite, egal welches Design. Was auf
 *  einer Seite nicht vorkommt, wird still übersprungen. JS-Fehler während der
 *  Bedienung zählen als Rot.
 *
 *      npm run interaktion            (nutzt dist/ – vorher npm run check)
 *      npm run interaktion -- --breiten 350,768,1440
 *
 *  Rot (Exit 1) = ein Bedien-Element ist kaputt. Die Seite darf so nicht raus.
 * =============================================================================
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { starteDistServer } from './lib/dist-server.mjs';

const WURZEL = process.cwd();
const DIST = join(WURZEL, 'dist');

const args = process.argv.slice(2);
const wert = (name, standard) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : standard;
};
// 350 = schmalstes Handy (dort lebt das Mobilmenü), 1440 = Desktop. Die mittlere
// Breite bringt für die MECHANIK nichts Neues – die prüft npm run sicht visuell.
const BREITEN = wert('breiten', '350,1440').split(',').map((b) => Number(b.trim()));

if (!existsSync(DIST)) {
  console.error('✗ dist/ fehlt. Zuerst "npm run check" (baut und prüft), dann "npm run interaktion".');
  process.exit(1);
}

// Nummerierung nur ab dem zweiten Vorkommen – bei einem einzigen Tabs-Block
// wäre „Tabs #1" nur Rauschen im Bericht.
const benenne = (name, nr) => (nr > 0 ? `${name} #${nr + 1}` : name);

const { basis: BASIS, seiten, stop } = await starteDistServer(DIST);

const probleme = [];
let geprueft = 0;

const browser = await chromium.launch();
console.log(`Interaktionstest: ${seiten.length} Seite(n) × ${BREITEN.length} Breiten (${BREITEN.join(', ')} px)\n`);

for (const seite of seiten) {
  for (const breite of BREITEN) {
    // „Bewegung reduzieren" macht den Test deterministisch: Slider springen
    // sofort statt zu gleiten (kein Warten auf halbe Animationen), und der
    // Auto-Durchlauf schaltet nicht mitten in der Messung weiter. Die Bausteine
    // respektieren die Einstellung ohnehin – das ist ihr regulärer Pfad.
    const kontext = await browser.newContext({
      viewport: { width: breite, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await kontext.newPage();

    const jsFehler = [];
    page.on('pageerror', (e) => jsFehler.push(e.message.split('\n')[0]));
    page.on('console', (m) => m.type() === 'error' && jsFehler.push(m.text().split('\n')[0]));

    await page.goto(BASIS + seite, { waitUntil: 'load' });
    // Die Bausteine starten als Modul-Skript vor dem load-Ereignis – die kurze
    // Pause ist nur Sicherheitsabstand für langsame Rechner.
    await page.waitForTimeout(250);

    /** @type {{baustein: string, ok: boolean, detail: string}[]} */
    const ergebnisse = [];

    // Die Klicks passieren bewusst per element.click() IM Browser (evaluate),
    // nicht über Playwrights Maus: Getestet wird die MECHANIK der Bausteine –
    // ob ein Element von etwas verdeckt wird, ist eine Layout-Frage und Sache
    // der Sichtprüfung. So bleibt der Test stabil über jedes Kundendesign.

    // --- Tabs: zweiten Tab klicken → Auswahl wandert, Panel wechselt ---------
    ergebnisse.push(...await page.evaluate(() => {
      const raus = [];
      document.querySelectorAll('[data-tabs]').forEach((box, nr) => {
        const knoepfe = [...box.querySelectorAll('[data-tab]')];
        const panels = [...box.querySelectorAll('[data-tabpanel]')];
        // Mit nur einem Tab gibt es nichts umzuschalten.
        if (knoepfe.length < 2 || panels.length === 0) return;

        const ziel = knoepfe[1];
        const id = ziel.dataset.tab;
        ziel.click();

        const fehler = [];
        if (ziel.getAttribute('aria-selected') !== 'true') fehler.push('aria-selected wandert nicht auf den geklickten Tab');
        if (knoepfe.some((k) => k !== ziel && k.getAttribute('aria-selected') === 'true')) fehler.push('mehrere Tabs gleichzeitig ausgewählt');
        const panel = panels.find((p) => p.dataset.tabpanel === id);
        if (!panel) fehler.push(`kein Panel zu data-tab="${id}" (data-tabpanel fehlt oder Tippfehler)`);
        else if (panel.hidden) fehler.push(`Panel "${id}" bleibt nach dem Klick versteckt`);
        if (panels.some((p) => p !== panel && !p.hidden)) fehler.push('ein inaktives Panel bleibt sichtbar');
        if (box.hasAttribute('data-tabs-url') && location.hash !== `#${id}`) {
          fehler.push(`URL-Anker fehlt (erwartet #${id}, ist "${location.hash || '(leer)'}")`);
        }
        raus.push({ baustein: nr > 0 ? `Tabs #${nr + 1}` : 'Tabs', ok: fehler.length === 0, detail: fehler.join('; ') });
      });
      return raus;
    }));

    // --- Filter: Kategorie klicken → Sichtbarkeit stimmt; „alle" zeigt alles -
    ergebnisse.push(...await page.evaluate(() => {
      const raus = [];
      document.querySelectorAll('[data-filter]').forEach((box, nr) => {
        const knoepfe = [...box.querySelectorAll('[data-filter-wert]')];
        const ziel = box.querySelector('[data-filter-ziel]') ?? box;
        const elemente = [...ziel.querySelectorAll('[data-kategorie]')];
        if (knoepfe.length === 0 || elemente.length === 0) return;

        const fehler = [];
        const kategorieKnopf = knoepfe.find((k) => k.dataset.filterWert !== 'alle');
        if (kategorieKnopf) {
          const kat = kategorieKnopf.dataset.filterWert;
          kategorieKnopf.click();
          // Erwartung aus dem Markup selbst ableiten: Elemente, deren
          // data-kategorie-Liste den Wert enthält, müssen sichtbar sein – genau die.
          const erwartet = elemente.filter((el) => (el.dataset.kategorie ?? '').split(/\s+/).includes(kat));
          const sichtbar = elemente.filter((el) => !el.hidden);
          if (sichtbar.length !== erwartet.length || sichtbar.some((el) => !erwartet.includes(el))) {
            fehler.push(`Filter "${kat}": ${sichtbar.length} Element(e) sichtbar, erwartet ${erwartet.length}`);
          }
        }
        const alleKnopf = knoepfe.find((k) => k.dataset.filterWert === 'alle');
        if (alleKnopf) {
          alleKnopf.click();
          const versteckt = elemente.filter((el) => el.hidden).length;
          if (versteckt > 0) fehler.push(`"alle" lässt ${versteckt} Element(e) versteckt`);
        }
        raus.push({ baustein: nr > 0 ? `Filter #${nr + 1}` : 'Filter', ok: fehler.length === 0, detail: fehler.join('; ') });
      });
      return raus;
    }));

    // --- Akkordeon: Eintrag umschalten; „exklusiv" lässt nur einen offen -----
    ergebnisse.push(...await page.evaluate(async () => {
      const raus = [];
      let nr = 0;
      for (const box of document.querySelectorAll('[data-akkordeon]')) {
        const eintraege = [...box.querySelectorAll('details')];
        if (eintraege.length === 0) continue;
        const exklusiv = box.hasAttribute('data-akkordeon-exklusiv');
        const fehler = [];

        // Bevorzugt den ZWEITEN Eintrag (der erste ist oft schon offen gestylt);
        // ist er bereits offen, den ersten geschlossenen nehmen.
        let ziel = eintraege[1] ?? eintraege[0];
        if (ziel.open) ziel = eintraege.find((d) => !d.open) ?? ziel;
        const summary = ziel.querySelector('summary');
        if (!summary) {
          fehler.push('<details> ohne <summary> – so ist nichts klickbar');
        } else {
          const warOffen = ziel.open;
          summary.click();
          // toggle-Ereignisse feuern verzögert – erst danach schließt
          // „exklusiv" die übrigen Einträge. Kurz warten, dann messen.
          await new Promise((r) => setTimeout(r, 200));
          if (ziel.open === warOffen) fehler.push(warOffen ? 'schließt nach Klick nicht' : 'öffnet nach Klick nicht');
          if (exklusiv && !warOffen) {
            const offen = eintraege.filter((d) => d.open).length;
            if (offen !== 1) fehler.push(`data-akkordeon-exklusiv, aber ${offen} Einträge gleichzeitig offen`);
          }
        }
        const name = `Akkordeon${exklusiv ? ' (exklusiv)' : ''}`;
        raus.push({ baustein: nr > 0 ? `${name} #${nr + 1}` : name, ok: fehler.length === 0, detail: fehler.join('; ') });
        nr++;
      }
      return raus;
    }));

    // --- Vergleich: Regler auf 25 → CSS-Variable --vergleich-pos ≈ 25 % ------
    ergebnisse.push(...await page.evaluate(() => {
      const raus = [];
      document.querySelectorAll('[data-vergleich]').forEach((box, nr) => {
        const regler = box.querySelector('[data-vergleich-regler]');
        if (!regler) return; // ohne Regler startet der Baustein selbst nicht
        regler.value = '25';
        regler.dispatchEvent(new Event('input', { bubbles: true }));
        const roh = box.style.getPropertyValue('--vergleich-pos');
        const pos = parseFloat(roh);
        const ok = Math.abs(pos - 25) < 0.6;
        raus.push({
          baustein: nr > 0 ? `Vergleich #${nr + 1}` : 'Vergleich',
          ok,
          detail: ok ? '' : `--vergleich-pos ist "${roh || '(nicht gesetzt)'}", erwartet 25%`,
        });
      });
      return raus;
    }));

    // --- Slider: Vor-Knopf → aktiver Punkt wandert bzw. Spur bewegt sich -----
    ergebnisse.push(...await page.evaluate(async () => {
      const raus = [];
      let nr = 0;
      for (const box of document.querySelectorAll('[data-slider]')) {
        const spur = box.querySelector('[data-slider-spur]');
        if (!spur || spur.children.length <= 1) continue; // Baustein startet dann selbst nicht
        const vor = box.querySelector('[data-slider-vor]');
        const punkte = [...(box.querySelector('[data-slider-punkte]')?.querySelectorAll('button') ?? [])];
        if (!vor && punkte.length === 0) continue; // reiner Wisch-Slider – nichts zu klicken

        const fehler = [];
        let hinweis = '';
        const aktivIndex = () => punkte.findIndex((p) => p.getAttribute('aria-selected') === 'true');
        const vorher = aktivIndex();
        const scrollVorher = spur.scrollLeft;

        if (vor) vor.click();
        else punkte[1].click();
        // Dank „Bewegung reduzieren" scrollt die Spur sofort; die Pause deckt
        // nur den nachlaufenden Scroll-Abgleich der Punkte (90 ms Debounce) ab.
        await new Promise((r) => setTimeout(r, 250));

        if (punkte.length > 0) {
          const erwartet = vor ? (vorher + 1) % punkte.length : 1;
          const nachher = aktivIndex();
          if (nachher !== erwartet) fehler.push(`aktiver Punkt bleibt bei ${vorher + 1}, erwartet Punkt ${erwartet + 1}`);
        } else if (spur.scrollWidth > spur.clientWidth + 2) {
          if (Math.abs(spur.scrollLeft - scrollVorher) < 2) fehler.push('Spur bewegt sich nach Klick auf den Vor-Knopf nicht');
        } else {
          // Alle Folien passen ins Bild (z. B. am Desktop): der Klick KANN
          // nichts bewegen – das ist kein Fehler, nur nichts Messbares.
          hinweis = 'Spur passt komplett ins Bild, Bewegung nicht messbar';
        }
        raus.push({ baustein: nr > 0 ? `Slider #${nr + 1}` : 'Slider', ok: fehler.length === 0, detail: fehler.join('; ') || hinweis });
        nr++;
      }
      return raus;
    }));

    // --- Lightbox: Bild klicken → Dialog offen; Escape schließt --------------
    // Escape braucht eine ECHTE Taste (page.keyboard): das Schließen des
    // nativen <dialog> macht der Browser selbst, kein JS-Listener.
    const lightboxGeklickt = await page.evaluate(() => {
      const box = document.querySelector('[data-lightbox]');
      const img = box?.querySelector('img');
      if (!img) return false;
      (img.closest('button') ?? img).click();
      return true;
    });
    if (lightboxGeklickt) {
      const fehler = [];
      const zustand = await page.evaluate(() => {
        const d = document.querySelector('dialog.lightbox');
        return d ? { offen: d.open, src: d.querySelector('img')?.getAttribute('src') ?? '' } : null;
      });
      if (!zustand) fehler.push('nach Klick aufs Bild entsteht kein <dialog class="lightbox">');
      else {
        if (!zustand.offen) fehler.push('Dialog vorhanden, aber nicht geöffnet');
        if (!zustand.src) fehler.push('Dialog zeigt kein Bild (leere src)');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(120);
        const nochOffen = await page.evaluate(() => document.querySelector('dialog.lightbox')?.open ?? false);
        if (nochOffen) fehler.push('Escape schließt die Lightbox nicht');
      }
      ergebnisse.push({ baustein: 'Lightbox', ok: fehler.length === 0, detail: fehler.join('; ') });
    }

    // --- Mobilmenü: nur in der Handy-Ansicht – am Desktop ist der Schalter ---
    // ausgeblendet, und ab 900 px setzt der Baustein sich selbst zurück.
    if (breite < 900) {
      const auf = await page.evaluate(() => {
        const schalter = document.querySelector('[data-menue-schalter]');
        const navi = document.querySelector('[data-menue]');
        if (!schalter || !navi) return null;
        schalter.click();
        return {
          expanded: schalter.getAttribute('aria-expanded'),
          offen: navi.classList.contains('ist-offen'),
        };
      });
      if (auf) {
        const fehler = [];
        if (auf.expanded !== 'true') fehler.push(`nach Klick ist aria-expanded="${auf.expanded}" statt "true"`);
        if (!auf.offen) fehler.push('Navigation bekommt keine Klasse .ist-offen');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(120);
        const zu = await page.evaluate(() => ({
          expanded: document.querySelector('[data-menue-schalter]')?.getAttribute('aria-expanded'),
          offen: document.querySelector('[data-menue]')?.classList.contains('ist-offen'),
        }));
        if (zu.expanded !== 'false' || zu.offen) fehler.push('Escape schließt das Menü nicht');
        ergebnisse.push({ baustein: 'Mobilmenü', ok: fehler.length === 0, detail: fehler.join('; ') });
      }
    }

    // --- Formular: im demo-Modus MUSS der Hinweis stehen, nie ein scharfes ---
    // Formular. Live nur Struktur prüfen – NIE absenden (würde echte Mails
    // auslösen bzw. als Spam-Versuch in der Zeitfalle landen).
    ergebnisse.push(...await page.evaluate(() => {
      const raus = [];
      // Den Modus verrät die gebaute Seite selbst: demo trägt noindex im Kopf.
      const istDemo = !!document.querySelector('meta[name="robots"][content*="noindex"]');
      const hinweise = document.querySelectorAll('[data-formular-demo]');
      const formulare = document.querySelectorAll('[data-formular]');

      if (istDemo) {
        if (formulare.length > 0) {
          raus.push({
            baustein: 'Formular',
            ok: false,
            detail: 'demo-Modus, aber ein scharfes Formular ist gerendert – es würde ins Leere senden. mode in content.config.ts prüfen und neu bauen (npm run check).',
          });
        }
        hinweise.forEach((_, i) => raus.push({ baustein: i > 0 ? `Formular (Demo-Hinweis) #${i + 1}` : 'Formular (Demo-Hinweis)', ok: true, detail: '' }));
      } else {
        if (hinweise.length > 0) {
          raus.push({
            baustein: 'Formular',
            ok: false,
            detail: 'live-Modus, aber der Demo-Hinweis steht noch da – niemand kann etwas absenden. Neu bauen (npm run check).',
          });
        }
        formulare.forEach((form, i) => {
          const fehler = [];
          if (!form.querySelector('[data-formular-absenden]')) fehler.push('Absende-Knopf [data-formular-absenden] fehlt');
          if (!form.querySelector('[data-formular-status]')) fehler.push('Status-Element [data-formular-status] fehlt (keine Rückmeldung nach dem Senden)');
          raus.push({ baustein: i > 0 ? `Formular (Struktur) #${i + 1}` : 'Formular (Struktur)', ok: fehler.length === 0, detail: fehler.join('; ') });
        });
      }
      return raus;
    }));

    // --- Bericht für diese Seite × Breite ------------------------------------
    geprueft += ergebnisse.length;
    const kennung = `${seite} @ ${breite}px`;
    const alleFehler = [...new Set(jsFehler)];

    if (ergebnisse.length === 0 && alleFehler.length === 0) {
      console.log(`  · ${kennung} — keine Verhaltens-Bausteine`);
    } else {
      const liste = ergebnisse.map((e) => `${e.baustein} ${e.ok ? '✓' : '✗'}`).join(' · ');
      const gruen = ergebnisse.every((e) => e.ok) && alleFehler.length === 0;
      console.log(`  ${gruen ? '✓' : '✗'} ${kennung} — ${liste || 'keine Bausteine'}${alleFehler.length ? ' · JS-Fehler ✗' : ''}`);
    }

    for (const e of ergebnisse) {
      if (!e.ok) probleme.push(`${kennung}: ${e.baustein} -> ${e.detail}`);
    }
    for (const f of alleFehler) probleme.push(`${kennung}: JS-Fehler während der Bedienung -> ${f.slice(0, 140)}`);

    await kontext.close();
  }
}

await browser.close();
stop();

console.log('');
if (probleme.length > 0) {
  console.log('✗ Interaktionstest NICHT bestanden:\n');
  for (const p of probleme) console.log(`  • ${p}`);
  console.log(`\n${probleme.length} Problem(e). Das erwartete Markup jedes Bausteins steht im Kopf
seiner Datei in src/lib/verhalten/ – meist fehlt ein data-Attribut oder eine
Zuordnung (Tab ohne Panel, Filterwert ohne Kategorie).`);
  process.exit(1);
}
console.log(`✓ Alle Bedien-Elemente funktionieren (${geprueft} Prüfung(en), ${seiten.length} Seite(n) × ${BREITEN.join('/')} px).`);
