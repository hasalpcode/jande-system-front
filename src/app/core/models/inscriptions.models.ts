import { TypeEngagement } from './parametrage.models';

export type Civilite = 'M' | 'MME' | 'MLLE';
export const CIVILITES: Civilite[] = ['M', 'MME', 'MLLE'];

export type Sexe = 'M' | 'F';
export const SEXES: Sexe[] = ['M', 'F'];

export type StatutAdmission = 'EN_ATTENTE' | 'ACCEPTE' | 'REJETE';
export type StatutInscription = 'EN_COURS' | 'VALIDEE' | 'ANNULEE';
export type StatutCarte = 'ACTIVE' | 'EXPIREE' | 'PERDUE';
export type StatutPaiementUniforme = 'PAYE' | 'NON_PAYE' | 'PARTIEL';

export type SituationMatrimoniale = 'CELIBATAIRE' | 'MARIE' | 'DIVORCE' | 'VEUF';
export const SITUATIONS_MATRIMONIALES: SituationMatrimoniale[] = ['CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF'];

export type PeriodeDisponibilite = 'MATIN' | 'APRES_MIDI' | 'SOIR';
export const PERIODES_DISPONIBILITE: PeriodeDisponibilite[] = ['MATIN', 'APRES_MIDI', 'SOIR'];

export interface CursusAnterieur {
  dernierEtablissement?: string;
  niveauEtude?: string;
  annee?: string;
  diplomeTitre?: string;
}

export interface Tuteur {
  nom: string;
  telephone: string;
}

export interface InfosProfessionnelles {
  societe?: string;
  telephoneBureau?: string;
  profession?: string;
  fonction?: string;
  adresseSociete?: string;
}

export interface Disponibilite {
  periode?: PeriodeDisponibilite;
  heureDebut?: string;
  heureFin?: string;
}

/** Champs communs a Candidat et Etudiant - voir Personne cote backend. */
export interface InfosPersonnelles {
  numeroIdentite: string | null;
  nom: string;
  prenom: string;
  dateNaissance: string | null;
  civilite: Civilite | null;
  sexe: Sexe | null;
  /** Data URI (base64), pas une URL. */
  photo: string | null;
  contact: string | null;
  nationaliteCode: string | null;
  autresInfos: string | null;
  maladies: string | null;
  observation: string | null;
  cursusAnterieur: CursusAnterieur | null;
  situationMatrimoniale: SituationMatrimoniale | null;
  lieuNaissance: string | null;
  adresse: string | null;
  telephone2: string | null;
  reseauSocial: string | null;
  siteWeb: string | null;
  email: string | null;
  infosProfessionnelles: InfosProfessionnelles | null;
  disponibilite: Disponibilite | null;
  fraisPreinscription: string | null;
}

export interface Candidat extends InfosPersonnelles {
  id: string;
  tuteurs: Tuteur[];
}

export interface FormulaireAdmission {
  id: string;
  dateSoumission: string;
  statut: StatutAdmission;
  candidat: Candidat;
  etudiant: Etudiant | null;
}

export interface InfosPersonnellesRequest {
  numeroIdentite?: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  civilite?: Civilite;
  sexe?: Sexe;
  photo?: string;
  contact?: string;
  nationaliteCode?: string;
  autresInfos?: string;
  maladies?: string;
  observation?: string;
  situationMatrimoniale?: SituationMatrimoniale;
  lieuNaissance?: string;
  adresse?: string;
  telephone2?: string;
  reseauSocial?: string;
  siteWeb?: string;
  email?: string;
  infosProfessionnelles?: InfosProfessionnelles;
  disponibilite?: Disponibilite;
  fraisPreinscription?: string;
}

export interface CandidatRequest extends InfosPersonnellesRequest {
  cursusAnterieur?: CursusAnterieur;
  tuteurs?: Tuteur[];
}

export interface Etudiant extends InfosPersonnelles {
  id: string;
  matricule: string;
  tuteurs: Tuteur[];
}

export interface ModifierEtudiantRequest extends InfosPersonnellesRequest {}

/** Choix proposes dans le formulaire d'inscription : toute inscription enregistree est
 * valide des sa creation, il n'y a plus d'etat intermediaire "en cours" a selectionner -
 * EN_COURS reste possible dans StatutInscription pour les inscriptions anciennes qui
 * l'ont deja, mais ne fait plus partie des choix proposes. */
export const STATUTS_INSCRIPTION: StatutInscription[] = ['VALIDEE', 'ANNULEE'];

export interface Inscription {
  id: string;
  numero: number;
  dateInscription: string;
  statut: StatutInscription;
  etudiant: Etudiant | null;
  classe: { id: string; libelle: string } | null;
  anneeAcademique: { id: string; libelle: string } | null;
}
export interface InscriptionRequest {
  etudiantId: string;
  classeId: string;
  anneeAcademiqueId: string;
}
export interface ModifierInscriptionRequest {
  classeId: string;
  anneeAcademiqueId: string;
  statut: StatutInscription;
}

export interface EcheancePrevue {
  id: string;
  dateEcheance: string;
  type: TypeEngagement;
  montantPrevu: number;
}
export interface EcheancePrevueRequest {
  dateEcheance: string;
  type: TypeEngagement;
  montantPrevu: number;
}

export interface CarteEtudiant {
  id: string;
  numero: string;
  dateEmission: string;
  dateExpiration: string;
  statut: StatutCarte;
}
export interface CarteEtudiantRequest {
  inscriptionId: string;
  numero: string;
  dateExpiration: string;
}

export interface AttributionUniforme {
  id: string;
  taille: string | null;
  statutPaiement: StatutPaiementUniforme;
}
export interface AttributionUniformeRequest {
  etudiantId: string;
  taille?: string;
}
