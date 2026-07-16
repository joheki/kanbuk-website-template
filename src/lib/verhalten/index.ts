/**
 * =============================================================================
 *  VERHALTENS-BAUSTEINE – Mechanik ohne Aussehen
 * =============================================================================
 *  Der Motor liefert das Verhalten, das Design liefert den Lack.
 *
 *  Jeder Baustein wird über data-Attribute im Markup aktiviert und vergibt
 *  ausschließlich ARIA-Attribute und Zustandsklassen (`ist-aktiv`, `ist-offen`).
 *  KEINE Farben, keine Abstände, keine Animationen – das gestaltet das Design.
 *
 *  Branchenneutral mit Absicht: „Tabs" sind Speisekarten-Kategorien beim Wirt,
 *  Wochentage beim Yoga-Studio und Leistungsbereiche beim Installateur.
 *
 *  Einbinden (einmal pro Seite, im BaseLayout):
 *      import { verhaltenStarten } from '../lib/verhalten';
 *      verhaltenStarten();
 * =============================================================================
 */

import { tabsStarten } from './tabs';
import { filterStarten } from './filter';
import { sliderStarten } from './slider';
import { akkordeonStarten } from './akkordeon';
import { lightboxStarten } from './lightbox';
import { mobilmenueStarten } from './mobilmenue';
import { vergleichStarten } from './vergleich';
import { formulareStarten } from './formular';
import { einwilligungStarten } from './einwilligung';
import { einbettungStarten } from './einbettung';

export { bewegungReduziert } from './hilfen';
export { erlaubt, beiFreigabe, widerrufen } from './einwilligung';

/** Startet alle Bausteine. Jeder prüft selbst, ob er auf der Seite gebraucht wird. */
export function verhaltenStarten(): void {
  // Einwilligung zuerst: Sie entscheidet, ob geparkte Skripte laufen dürfen.
  // Ohne konfigurierte Dienste passiert hier nichts (Seite bleibt cookiefrei).
  einwilligungStarten();
  einbettungStarten();

  tabsStarten();
  filterStarten();
  sliderStarten();
  akkordeonStarten();
  lightboxStarten();
  mobilmenueStarten();
  vergleichStarten();
  formulareStarten();
}
