/**
 * Branchen – was davon übrig ist, ist reine SEO-Information.
 *
 * Das Design kommt aus Claude Design, nicht mehr aus dem Preset. Geblieben ist
 * nur, was Suchmaschinen brauchen: der Schema.org-Subtyp von LocalBusiness.
 * (Früher standen hier auch Farben, Schriften, Sektions-Reihenfolgen und
 * Paletten – all das entscheidet jetzt das Design.)
 */
import type { Branche } from '../../content.config';

/** Schema.org-Typ je Branche für die JSON-LD-Auszeichnung (LocalBusiness-Subtyp). */
export const BRANCHE_JSONLD_TYP: Record<Branche, string> = {
  gastro: 'Restaurant',
  cafe: 'CafeOrCoffeeShop',
  bar: 'BarOrPub',
  beauty: 'HealthAndBeautyBusiness',
  friseur: 'HairSalon',
  handwerk: 'HomeAndConstructionBusiness',
  dienstleistung: 'ProfessionalService',
  praxis: 'MedicalBusiness',
  zahnarzt: 'Dentist',
  physio: 'Physiotherapy',
  studio: 'SportsActivityLocation',
  kfz: 'AutoRepair',
  handel: 'Store',
  sonstiges: 'LocalBusiness',
};
