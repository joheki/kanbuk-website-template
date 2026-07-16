/**
 * Bild-Auflösung: In content.config.ts steht nur der Dateiname – hier wird
 * daraus ein echtes astro:assets-Bild, damit <Image> moderne Formate (WebP)
 * und responsive Größen erzeugt.
 *
 * ALLE Bilder liegen in `fotos/` im Projekt-Hauptordner. Ein einziger,
 * offensichtlicher Ort zum Ablegen – siehe fotos/README.md.
 */
import type { ImageMetadata } from 'astro';

const fotos = import.meta.glob<{ default: ImageMetadata }>(
  '/fotos/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

/** Alle bekannten Dateinamen (auch aus Unterordnern) – für Fehlermeldungen. */
function bekannteNamen(): string[] {
  return Object.keys(fotos).map((p) => p.replace('/fotos/', ''));
}

/**
 * Liefert das Bild zu einem Dateinamen aus content.config.ts.
 *
 * Findet Bilder auch in Unterordnern: `bild('hero.jpg')` findet
 * `fotos/hero.jpg` genauso wie `fotos/galerie/hero.jpg`. So kann der Nutzer
 * seine Fotos ablegen, wie es ihm passt, ohne über Pfade nachzudenken.
 */
export function bild(dateiname: string): ImageMetadata | undefined {
  if (!dateiname) return undefined;

  // 1. Direkter Treffer (Dateiname oder Pfad relativ zu fotos/)
  const direkt = fotos[`/fotos/${dateiname}`];
  if (direkt) return direkt.default;

  // 2. Sonst nach dem reinen Dateinamen in beliebigem Unterordner suchen
  const nurName = dateiname.split('/').pop()!.toLowerCase();
  const treffer = Object.entries(fotos).find(
    ([pfad]) => pfad.split('/').pop()!.toLowerCase() === nurName,
  );
  if (treffer) return treffer[1].default;

  console.warn(
    `[bilder] "${dateiname}" liegt nicht in fotos/.\n` +
      `          Vorhanden: ${bekannteNamen().join(', ') || '(keine Bilder)'}\n` +
      `          Foto in den Ordner "fotos/" legen – Dateiname muss zur Config passen.`,
  );
  return undefined;
}
