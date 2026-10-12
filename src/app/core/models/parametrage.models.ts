export interface AnneeAcademique {
  id: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  active: boolean;
}
export interface AnneeAcademiqueRequest {
  libelle: string;
  dateDebut: string;
  dateFin: string;
}

export interface Semestre {
  id: string;
  libelle: string;
  ordre: number;
  dateDebut: string;
  dateFin: string;
  anneeAcademiqueId: string;
}
export interface SemestreRequest {
  libelle: string;
  ordre: number;
  dateDebut: string;
  dateFin: string;
  anneeAcademiqueId: string;
}

export interface Domaine {
  id: string;
  code: string;
  libelle: string;
}
export interface DomaineRequest {
  code: string;
  libelle: string;
}

export interface Mention {
  id: string;
  code: string;
  libelle: string;
  domaineId: string;
}
export interface MentionRequest {
  code: string;
  libelle: string;
  domaineId: string;
}

export interface Option {
  id: string;
  code: string;
  libelle: string;
  mentionId: string;
}
export interface OptionRequest {
  code: string;
  libelle: string;
  mentionId: string;
}

export type TypeFiliere = 'SPECIALITE' | 'FILIERE';

export interface FiliereAcademique {
  id: string;
  code: string;
  libelle: string;
  optionId: string;
  grade: string | null;
}
export interface FiliereRequest {
  code: string;
  libelle: string;
  optionId: string;
  type: TypeFiliere;
  grade?: string;
}

export interface Niveau {
  id: string;
  libelle: string;
  ordre: number;
}
export interface NiveauRequest {
  libelle: string;
  ordre: number;
}

export type TypeSalle = 'CM' | 'TD' | 'AMPHI';
export const TYPES_SALLE: TypeSalle[] = ['CM', 'TD', 'AMPHI'];

export interface Salle {
  id: string;
  code: string;
  libelle: string;
  capacite: number;
  type: TypeSalle;
}
export interface SalleRequest {
  code: string;
  libelle: string;
  capacite: number;
  type: TypeSalle;
}

export type TypeEngagement =
  | 'INSCRIPTION'
  | 'SCOLARITE'
  | 'EXAMEN'
  | 'SOUTENANCE'
  | 'DOSSIER'
  | 'UNIFORME'
  | 'ASSURANCE'
  | 'AMICALE'
  | 'BIBLIOTHEQUE'
  | 'STAGE'
  | 'CANTINE'
  | 'TRANSPORT'
  | 'AUTRE';
export const TYPES_ENGAGEMENT: TypeEngagement[] = [
  'INSCRIPTION',
  'SCOLARITE',
  'EXAMEN',
  'SOUTENANCE',
  'DOSSIER',
  'UNIFORME',
  'ASSURANCE',
  'AMICALE',
  'BIBLIOTHEQUE',
  'STAGE',
  'CANTINE',
  'TRANSPORT',
  'AUTRE',
];

/** Les 12 colonnes du tableau pivoté des engagements (Financier > Engagements) - AUTRE en est exclu. */
export const TYPES_ENGAGEMENT_PIVOT: { type: TypeEngagement; label: string }[] = [
  { type: 'INSCRIPTION', label: 'Frais inscription' },
  { type: 'SCOLARITE', label: 'Frais scolarité' },
  { type: 'EXAMEN', label: 'Frais examen' },
  { type: 'SOUTENANCE', label: 'Frais soutenance' },
  { type: 'DOSSIER', label: 'Frais dossier' },
  { type: 'UNIFORME', label: 'Frais uniforme' },
  { type: 'ASSURANCE', label: 'Frais assurance' },
  { type: 'AMICALE', label: 'Frais amicale' },
  { type: 'BIBLIOTHEQUE', label: 'Frais bibliothèque' },
  { type: 'STAGE', label: 'Frais stage' },
  { type: 'CANTINE', label: 'Frais cantine' },
  { type: 'TRANSPORT', label: 'Frais transport' },
];

export interface Engagement {
  id: string;
  libelle: string;
  montant: number;
  type: TypeEngagement;
  nombreEcheances: number;
  dateDebutEcheances: string | null;
  anneeAcademiqueId: string;
  niveauId: string;
}
export interface EngagementRequest {
  libelle: string;
  montant: number;
  type: TypeEngagement;
  anneeAcademiqueId: string;
  niveauId: string;
  nombreEcheances?: number;
  dateDebutEcheances?: string;
}

export type TypeMode = 'ESPECES' | 'VIREMENT' | 'MOBILE_MONEY' | 'CHEQUE';
export const TYPES_MODE: TypeMode[] = ['ESPECES', 'VIREMENT', 'MOBILE_MONEY', 'CHEQUE'];

export interface ModePaiement {
  id: string;
  libelle: string;
  type: TypeMode;
}
export interface ModePaiementRequest {
  libelle: string;
  type: TypeMode;
}

export interface Partenaire {
  id: string;
  nom: string;
  type: string | null;
  contact: string | null;
}
export interface PartenaireRequest {
  nom: string;
  type?: string;
  contact?: string;
}

export interface Nationalite {
  id: string;
  code: string;
  libelle: string;
}
export interface NationaliteRequest {
  code: string;
  libelle: string;
}

export interface EtablissementInfo {
  nom: string;
  adresse: string | null;
  telephone: string | null;
  /** Data URI (base64), pas une URL. */
  logo: string | null;
}
export interface ModifierEtablissementInfoRequest {
  nom: string;
  adresse?: string;
  telephone?: string;
  logo?: string;
}

export interface ReconductionRequest {
  anneeSourceId: string;
  anneeCibleId: string;
}
export interface ReconductionResultat {
  semestresReconduits: number;
  classesReconduites: number;
  unitesEnseignementReconduites: number;
  elementsConstitutifsReconduits: number;
  engagementsReconduits: number;
}
