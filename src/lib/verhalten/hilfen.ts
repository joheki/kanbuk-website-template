/** Gemeinsame Hilfen der Verhaltens-Bausteine (eigene Datei = kein Ringschluss). */

/** Respektiert die Systemeinstellung „Bewegung reduzieren". */
export function bewegungReduziert(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
