/**
 * =============================================================================
 *  content.config.ts  –  DIE MOTOR-SCHNITTSTELLE
 * =============================================================================
 *  Hier stehen die Daten, die der MOTOR braucht, um seine Arbeit zu tun:
 *  Meta-Tags, JSON-LD, Formulare, Rechtstexte, demo/live-Logik.
 *
 *  WAS HIER *NICHT* STEHT:
 *  Layout, Aufbau und Gestaltung. Das kommt aus dem Design (Claude Design)
 *  und lebt in den Seiten-Komponenten unter src/components/.
 *
 *  Faustregel: Steht es im Browser-Tab, in Google, in einer E-Mail oder im
 *  Impressum -> hierher. Sieht man es auf der Seite -> Design.
 *
 *  Ausnahme mit Absicht: Tabellarische Daten, die sich oft ändern
 *  (Speisekarte, Preisliste) stehen hier bzw. in daten/ – damit eine
 *  Preisänderung eine Ein-Datei-Änderung bleibt.
 * =============================================================================
 */

import { BRANCHE_JSONLD_TYP } from './src/lib/branchen';

// ---------------------------------------------------------------------------
//  Auswahl-Werte
// ---------------------------------------------------------------------------

/** Branche – steuert NUR den Schema.org-Typ (SEO). Kein Design. */
export type Branche =
  | 'gastro'
  | 'cafe'
  | 'bar'
  | 'beauty'
  | 'friseur'
  | 'handwerk'
  | 'dienstleistung'
  | 'praxis'
  | 'zahnarzt'
  | 'physio'
  | 'studio'
  | 'kfz'
  | 'handel'
  | 'sonstiges';

/** demo = Vorschau (kein Index, Formular aus). live = öffentlich, alles scharf. */
export type Mode = 'demo' | 'live';

/** Ansprache – betrifft die Motor-Texte (Formular). Kundentexte kommen aus dem Design. */
export type Ansprache = 'du' | 'sie';

/**
 * Unterstützte Sprachen. 'de' ist immer die Hauptsprache.
 * WICHTIG: 'en' NUR eintragen, wenn die englischen Seiten wirklich als Routen
 * gebaut werden (src/pages/en/…) – sonst zeigen die hreflang-Verweise ins
 * Leere. Das Prüf-Tor kontrolliert genau das.
 */
export type Sprache = 'de' | 'en';

// ---------------------------------------------------------------------------
//  Design-Tokens – die Nahtstelle zwischen Claude Design und Motor
// ---------------------------------------------------------------------------

/**
 * Farben aus dem Design. Drei sind Pflicht, weil der Motor sich darauf verlässt;
 * beliebige weitere frei benennbar -> werden zu --farbe-<name>.
 *
 * Beispiel (dunkler Auftritt):
 *   { hintergrund: '#14120f', text: '#f0ece4', primaer: '#b8763a',
 *     akzent: '#3a8f86', flaeche: '#1c1916' }
 */
export interface DesignFarben {
  /** Seitenhintergrund. */
  hintergrund: string;
  /** Standard-Textfarbe. */
  text: string;
  /** Hauptakzent – auch für Fokus-Ringe und theme-color. */
  primaer: string;
  [name: string]: string;
}

/**
 * Schriften aus dem Design. Die Familien müssen lokal vorliegen –
 * `npm run schrift -- --familie "<Name>"` lädt sie herunter und bettet sie ein.
 * NIE eine CDN-Schrift verlinken (externe Requests sind verboten).
 */
export interface DesignSchriften {
  ueberschrift: string;
  text: string;
  [name: string]: string;
}

/**
 * Wie sich die Seite beim Scrollen anfühlt. Variiert NUR die bestehende
 * Einblende-Animation (Dauer, Distanz, Kurve) – kein zusätzliches JS,
 * „Bewegung reduzieren" des Besuchers gewinnt immer.
 *   aus      – keine Einblendungen
 *   dezent   – kaum merklich (Standard)
 *   lebendig – schneller, spürbarer Schwung (Studio, Bar)
 *   elegant  – langsamer, weicher (Beauty, Fine Dining)
 */
export type AnimationsPreset = 'aus' | 'dezent' | 'lebendig' | 'elegant';

export interface Design {
  farben: DesignFarben;
  schriften: DesignSchriften;
  /** z. B. '0px', '8px' – aus dem Design übernommen. */
  radius?: string;
  /** Siehe AnimationsPreset. Weglassen = 'dezent'. */
  animation?: AnimationsPreset;
}

// ---------------------------------------------------------------------------
//  Seiten & Navigation
// ---------------------------------------------------------------------------

/**
 * Eine echte Unterseite mit eigener URL. Jede Seite hat eigene Meta-Angaben –
 * das ist der ganze Grund, warum wir keine Onepager mehr bauen.
 */
export interface Seite {
  /** Route, z. B. '/' oder '/speisekarte'. Ohne Sprach-Präfix. */
  pfad: string;
  /** Beschriftung in der Navigation. */
  navTitel: string;
  /** <title> der Seite. Ohne Betriebsnamen – der wird angehängt. */
  metaTitel: string;
  /** <meta name="description"> – 120–160 Zeichen, eigenständig je Seite. */
  metaBeschreibung: string;
  /** In der Hauptnavigation zeigen? Default: true. */
  inNavigation?: boolean;
  /** Eigenes OG-Bild für DIESE Seite – Dateiname in **public/** (nicht fotos/!),
      z. B. 'og-speisekarte.jpg'. Erzeugen mit:
      npm run og -- --bild fotos/<foto>.jpg --ziel public/og-<seite>.jpg
      Weglassen = globales OG-Bild (public/og.jpg). */
  ogBild?: string;
}

// ---------------------------------------------------------------------------
//  Betriebsdaten – Grundlage für JSON-LD, Impressum, Kontakt
// ---------------------------------------------------------------------------

export interface Oeffnungszeit {
  /** z. B. 'Mo–Fr', 'Samstag' */
  tag: string;
  /** z. B. '08:00–18:00' oder 'geschlossen' */
  zeit: string;
  /** Maschinenlesbar für Google, Kurzcodes: Mo Tu We Th Fr Sa Su.
      (Werden beim Bauen automatisch zu 'Monday' usw. übersetzt.) */
  tageISO?: string[];
  /** Maschinenlesbar, z. B. '08:00' / '18:00' */
  vonISO?: string;
  bisISO?: string;
}

export interface SocialLink {
  plattform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'whatsapp' | 'website';
  url: string;
}

export interface Adresse {
  strasse: string;
  plz: string;
  ort: string;
  land?: string;
  /** Link, der beim Klick auf das Kartenbild geöffnet wird. */
  googleMapsUrl: string;
  /** Statisches Kartenbild in fotos/ – erzeugt via `npm run karte`.
      NIEMALS ein Live-Embed: das setzt Cookies. */
  karteBild?: string;
}

export interface Betrieb {
  name: string;
  claim: string;
  /** 1–2 Sätze. Fällt als Meta-Description zurück, wenn eine Seite keine hat. */
  kurzbeschreibung: string;
  telefon: string;
  email: string;
  adresse: Adresse;
  oeffnungszeiten: Oeffnungszeit[];
  socialLinks: SocialLink[];
  /** Dateiname in fotos/. */
  logo?: string;
}

// ---------------------------------------------------------------------------
//  Formulare – ein Motor, beliebig viele Formulare
// ---------------------------------------------------------------------------

export type FeldTyp = 'text' | 'email' | 'tel' | 'textarea' | 'datum' | 'zeit' | 'zahl' | 'auswahl';

export interface FormularFeld {
  /** Feldname, landet so in der E-Mail. */
  name: string;
  label: string;
  typ: FeldTyp;
  pflicht?: boolean;
  /** Nur für typ 'auswahl'. */
  optionen?: string[];
  /** Browser-Autovervollständigung, z. B. 'name', 'email', 'tel'. */
  autocomplete?: string;
  /** Platzhalter im Feld. */
  platzhalter?: string;
  /** Nur für typ 'zahl'. */
  min?: number;
  max?: number;
}

/**
 * Ein Formular. Der Motor rendert die Felder, prüft sie, verschickt sie über
 * Resend und blockt Spam per Honeypot. Das AUSSEHEN kommt aus dem Design.
 *
 * Typische Formulare: 'kontakt' (überall), 'reservierung' (Gastro),
 * 'termin' (Beauty/Praxis), 'angebot' (Handwerk).
 */
export interface Formular {
  /** Eindeutige ID, z. B. 'kontakt' oder 'reservierung'. */
  id: string;
  /** Betreff der E-Mail an den Betrieb. */
  betreff: string;
  felder: FormularFeld[];
}

// ---------------------------------------------------------------------------
//  Preisliste / Speisekarte – branchenneutral
//  Funktioniert für Speisekarte (Gastro), Behandlungen (Beauty),
//  Leistungen (Handwerk/KFZ) und Kurse (Studio).
// ---------------------------------------------------------------------------

export interface PreisVariante {
  /** z. B. '0,33 l', 'klein', '60 Min' */
  groesse: string;
  preis: string;
}

export interface PreisPosition {
  name: string;
  beschreibung?: string;
  /** Einzelpreis. Entfällt, wenn `varianten` gesetzt ist. */
  preis?: string;
  /** Mehrere Größen/Preise, z. B. 0,33 l und 0,5 l. */
  varianten?: PreisVariante[];
  /** Allergene laut österreichischer Kennzeichnung, z. B. 'A C G'.
      Pflicht in der Gastronomie, sobald Speisen gelistet sind. */
  allergene?: string;
  /** Dauer, z. B. '60 Min' – für Behandlungen, Training, Kurse. */
  dauer?: string;
  /** Freie Kennzeichnungen, z. B. 'veg', 'vegan', 'scharf'. */
  tags?: string[];
  /** Foto (Dateiname in fotos/). */
  bild?: string;
}

export interface PreisGruppe {
  titel: string;
  /** Hinweis unter der Gruppe, z. B. 'Zu jedem Kuchen eine Kugel Eis um 2,00 €.' */
  notiz?: string;
  positionen: PreisPosition[];
}

/** Eine Kategorie – wird üblicherweise als Tab dargestellt. */
export interface PreisKategorie {
  /** ID für den Tab-Anker, z. B. 'fruehstueck'. */
  id: string;
  titel: string;
  untertitel?: string;
  /** Kategoriebild (Dateiname in fotos/). */
  bild?: string;
  gruppen: PreisGruppe[];
}

export interface Preisliste {
  kategorien: PreisKategorie[];
  /** Allergen-Legende, z. B. { A: 'Glutenhaltiges Getreide' }. */
  allergene?: Record<string, string>;
  /** Hinweise unter der Karte (Preise inkl. MwSt., Küchenzeiten, Stand …). */
  hinweise?: string[];
  /** Original als PDF in public/, z. B. 'speisekarte.pdf'. */
  pdfDatei?: string;
}

// ---------------------------------------------------------------------------
//  Ausbau: Dienste (Tracking/Pixel) – standardmäßig LEER
// ---------------------------------------------------------------------------

/**
 * Einwilligungs-Kategorien.
 *  notwendig  – ohne die geht die Seite nicht (nie zustimmungspflichtig)
 *  funktional – Komfort, z. B. eine eingebettete Karte
 *  statistik  – Reichweitenmessung
 *  marketing  – Pixel, Remarketing, Ads
 */
export type Kategorie = 'notwendig' | 'funktional' | 'statistik' | 'marketing';

/**
 * Ein externer Dienst (Meta-Pixel, Google Ads, Analytics …).
 *
 * WICHTIG: Solange diese Liste LEER ist, ist die Seite cookiefrei, es gibt
 * keinen Banner und keine externen Requests. Das ist der Normalfall und ein
 * Verkaufsargument – bitte nur auf ausdrücklichen Kundenwunsch befüllen.
 *
 * Sobald ein Dienst drinsteht:
 *  - erscheint der Einwilligungs-Banner
 *  - lädt NICHTS, bevor der Besucher zugestimmt hat (Opt-in, DSGVO)
 *  - erscheint der Dienst automatisch in der Datenschutzerklärung
 *
 * Beispiel Meta-Pixel:
 *   { id: 'meta-pixel', name: 'Meta-Pixel', anbieter: 'Meta Platforms Ireland Ltd.',
 *     kategorie: 'marketing', zweck: 'Messung von Werbeerfolgen auf Facebook/Instagram',
 *     datenschutzUrl: 'https://www.facebook.com/privacy/policy/',
 *     skript: `!function(f,b,e,v,n,t,s){…}` }
 */
export interface Dienst {
  id: string;
  name: string;
  /** Anbieter mit Rechtsform – Pflichtangabe für die Datenschutzerklärung. */
  anbieter: string;
  kategorie: Kategorie;
  /** Wozu? Verständlich formuliert – steht so in der Datenschutzerklärung. */
  zweck: string;
  /** Datenschutzerklärung des Anbieters. */
  datenschutzUrl: string;
  /** Externe Skript-Adresse ODER Inline-Code. Wird bis zur Zustimmung geparkt. */
  quelle?: string;
  skript?: string;
  /** Setzt der Dienst Cookies? Für die Datenschutzerklärung. */
  setztCookies?: boolean;
}

// ---------------------------------------------------------------------------
//  Weiterleitungen – rettet das Google-Ranking bei bestehender Website
// ---------------------------------------------------------------------------

/**
 * Hatte der Betrieb schon eine Website mit anderen Adressen, MUSS jede alte
 * Adresse auf die neue zeigen. Sonst laufen bestehende Google-Treffer und
 * fremde Links ins Leere – der Kunde verliert seine mühsam aufgebaute
 * Sichtbarkeit über Nacht.
 *
 * Beispiel:  { von: '/speisen.html', nach: '/speisekarte' }
 */
export interface Weiterleitung {
  /** Alte Adresse (Pfad, wie er früher war). */
  von: string;
  /** Neue Adresse. */
  nach: string;
  /** 301 = dauerhaft (Standard, vererbt das Ranking). 302 = vorübergehend. */
  status?: 301 | 302;
}

// ---------------------------------------------------------------------------
//  Recht
// ---------------------------------------------------------------------------

export interface Rechtstexte {
  firmenwortlaut: string;
  rechtsform: string;
  /** Kann von der Kontaktadresse abweichen (Sitz laut Firmenbuch). */
  adresse: string;
  /** UID-Nummer, falls vorhanden. */
  uid: string;
  aufsichtsbehoerde: string;
  /** Gewerbeberechtigung / Kammer-Mitgliedschaft. */
  gewerbe: string;
  firmenbuchnummer: string;
  firmenbuchgericht: string;
}

// ---------------------------------------------------------------------------
//  Die Gesamt-Config
// ---------------------------------------------------------------------------

export interface SiteConfig {
  betrieb: Betrieb;
  design: Design;
  seiten: Seite[];
  formulare: Formular[];
  preisliste?: Preisliste;
  rechtstexte: Rechtstexte;

  /**
   * Externe Dienste (Pixel/Tracking). LEER = cookiefrei, kein Banner.
   * Nur auf ausdrücklichen Kundenwunsch befüllen.
   */
  dienste: Dienst[];
  /** Alte Adressen der Vorgänger-Website -> neue. Rettet das Google-Ranking. */
  weiterleitungen: Weiterleitung[];

  // Steuerung
  branche: Branche;
  mode: Mode;
  ansprache: Ansprache;
  sprachen: Sprache[];
  /** Volle URL ohne abschließenden Schrägstrich, z. B. 'https://ihr-betrieb.at'. */
  domain: string;
  /**
   * Cookielose Besucherzählung. 'vercel' = Vercel Web Analytics – wird im
   * Vercel-Dashboard des Projekts aktiviert (Analytics → Enable), läuft über
   * die eigene Domain, setzt keine Cookies, braucht keinen Banner.
   * Dieses Feld sorgt nur dafür, dass die Datenschutzerklärung den passenden
   * Absatz bekommt. Weglassen = keine Zählung, kein Absatz.
   */
  besucherzaehlung?: 'vercel';
  /** Globales OG-Bild (in public/), Standard: '/og.jpg'. */
  ogBild: string;
}

/** Felder, die aufloesen() mit Standardwerten füllt. */
type OptionaleFelder = 'ansprache' | 'sprachen' | 'formulare' | 'ogBild' | 'dienste' | 'weiterleitungen';

export type KundenKonfig = Omit<SiteConfig, OptionaleFelder> &
  Partial<Pick<SiteConfig, OptionaleFelder>>;

/** Füllt Standardwerte auf und liefert die fertige Config. */
export function aufloesen(k: KundenKonfig): SiteConfig {
  return {
    ...k,
    ansprache: k.ansprache ?? 'sie',
    sprachen: k.sprachen ?? ['de'],
    formulare: k.formulare ?? [],
    ogBild: k.ogBild ?? '/og.jpg',
    // Standard: keine Dienste -> cookiefrei, kein Banner. Das ist Absicht.
    dienste: k.dienste ?? [],
    weiterleitungen: k.weiterleitungen ?? [],
  };
}

/** Schema.org-Typ für die JSON-LD-Auszeichnung. */
export function jsonLdTyp(branche: Branche): string {
  return BRANCHE_JSONLD_TYP[branche];
}

/**
 * Braucht diese Seite einen Einwilligungs-Banner?
 * Nur, wenn zustimmungspflichtige Dienste konfiguriert sind. Ohne sie bleibt
 * die Seite cookiefrei und banner-frei.
 */
export function brauchtEinwilligung(s: SiteConfig): boolean {
  return s.dienste.some((d) => d.kategorie !== 'notwendig');
}

// ===========================================================================
//  REFERENZ-DATEN
//  ---------------------------------------------------------------------------
//  Ein neutraler Beispielbetrieb, damit `npm run dev` sofort läuft und der
//  technische Standard sichtbar ist.
//
//  >>> BEIM KUNDEN: diesen Block komplett ersetzen. <<<
//  `npm run check` schlägt an, solange Referenz-Reste drinstehen.
// ===========================================================================

const konfig = {
  betrieb: {
    name: 'Muster Betrieb',
    claim: 'Referenz-Seite des Kanbuk-Motors',
    kurzbeschreibung:
      'Diese Seite zeigt den technischen Standard, den jede Kundenseite erfüllen muss. Sie wird beim Kunden vollständig durch das Design ersetzt.',
    telefon: '+43 1 000 00 00',
    email: 'hallo@muster-betrieb.example',
    adresse: {
      strasse: 'Musterstraße 1',
      plz: '1010',
      ort: 'Wien',
      land: 'AT',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Musterstra%C3%9Fe+1+1010+Wien',
    },
    oeffnungszeiten: [
      { tag: 'Mo–Fr', zeit: '09:00–18:00', tageISO: ['Mo', 'Tu', 'We', 'Th', 'Fr'], vonISO: '09:00', bisISO: '18:00' },
      { tag: 'Samstag', zeit: '09:00–13:00', tageISO: ['Sa'], vonISO: '09:00', bisISO: '13:00' },
      { tag: 'Sonntag', zeit: 'geschlossen' },
    ],
    socialLinks: [],
  },

  // Design-Tokens: beim Kunden aus dem Claude Design übernehmen.
  design: {
    farben: {
      hintergrund: '#ffffff',
      text: '#1a1a1a',
      primaer: '#1a1a1a',
      flaeche: '#f4f4f5',
    },
    schriften: {
      ueberschrift: 'Georgia, serif',
      text: 'system-ui, sans-serif',
    },
    radius: '0px',
  },

  seiten: [
    {
      pfad: '/',
      navTitel: 'Start',
      metaTitel: 'Referenz-Seite',
      metaBeschreibung:
        'Referenz-Seite des Kanbuk-Motors: zeigt Token-System, Meta-Struktur und Prüf-Tor. Wird beim Kunden durch das Design ersetzt.',
    },
  ],

  formulare: [
    {
      id: 'kontakt',
      betreff: 'Neue Anfrage über die Website',
      felder: [
        { name: 'name', label: 'Name', typ: 'text', pflicht: true, autocomplete: 'name' },
        { name: 'email', label: 'E-Mail', typ: 'email', pflicht: true, autocomplete: 'email' },
        { name: 'telefon', label: 'Telefon', typ: 'tel', autocomplete: 'tel' },
        { name: 'nachricht', label: 'Nachricht', typ: 'textarea', pflicht: true },
      ],
    },
  ],

  branche: 'sonstiges',
  mode: 'demo',
  ansprache: 'sie',
  sprachen: ['de'],
  domain: 'https://muster-betrieb.example',

  rechtstexte: {
    firmenwortlaut: 'Muster Betrieb e.U.',
    rechtsform: 'Eingetragenes Einzelunternehmen (e.U.)',
    adresse: 'Musterstraße 1, 1010 Wien, Österreich',
    uid: 'ATU00000000',
    aufsichtsbehoerde: 'Magistratisches Bezirksamt für den 1. Bezirk',
    gewerbe: 'Mitglied der WKO Wien',
    firmenbuchnummer: 'FN 000000a',
    firmenbuchgericht: 'Handelsgericht Wien',
  },
} satisfies KundenKonfig;

export const site: SiteConfig = aufloesen(konfig);

export default site;
