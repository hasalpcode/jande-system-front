import { Civilite, Sexe, SituationMatrimoniale } from './inscriptions.models';

export type TypeProfesseur = 'PERMANENT' | 'VACATAIRE';
export const TYPES_PROFESSEUR: TypeProfesseur[] = ['PERMANENT', 'VACATAIRE'];

export interface Professeur {
  id: string;
  codeProf: string;
  civilite: Civilite | null;
  sexe: Sexe | null;
  situationMatrimoniale: SituationMatrimoniale | null;
  nom: string;
  prenom: string;
  titre: string | null;
  specialite: string | null;
  nationaliteCode: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  type: TypeProfesseur;
}
export interface ProfesseurRequest {
  civilite?: Civilite;
  sexe?: Sexe;
  situationMatrimoniale?: SituationMatrimoniale;
  nom: string;
  prenom: string;
  titre?: string;
  specialite?: string;
  nationaliteCode?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  type?: TypeProfesseur;
}

export interface Affectation {
  id: string;
  volumeHorairePrevu: number;
  professeur: { id: string; nom: string; prenom: string; codeProf: string } | null;
  elementConstitutif: { id: string; code: string; intitule: string; credits: number } | null;
  classe: { id: string; libelle: string } | null;
}
export interface AffectationRequest {
  professeurId: string;
  elementConstitutifId: string;
  classeId: string;
  volumeHorairePrevu: number;
}

export type TypeSeance = 'CM' | 'TD' | 'TP';
export const TYPES_SEANCE: TypeSeance[] = ['CM', 'TD', 'TP'];

/** Une séance porte son propre contenu/chapitre enseigné (registre de cours fusionné) -
 * salle et type sont facultatifs : une séance peut être juste "loggée" sans réservation. */
export interface SeanceCours {
  id: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  type: TypeSeance | null;
  contenu: string | null;
  affectation: { id: string; classe: { id: string; libelle: string } | null } | null;
  salle: { id: string; libelle: string } | null;
}
export interface SeanceCoursRequest {
  affectationId: string;
  salleId?: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  type?: TypeSeance;
  contenu?: string;
}

export type TypePersonnePresence = 'ETUDIANT' | 'PROFESSEUR';
export type StatutPresence = 'PRESENT' | 'ABSENT' | 'RETARD';
export const STATUTS_PRESENCE: StatutPresence[] = ['PRESENT', 'ABSENT', 'RETARD'];

export interface Presence {
  id: string;
  statut: StatutPresence;
  dureeRetardMin: number;
  /** Sans objet pour un statut PRESENT - pertinent pour ABSENT/RETARD uniquement. */
  justifie: boolean;
  /** Data URI (base64), pas une URL - même convention que Etudiant.photo. */
  pieceJustificative: string | null;
  personneId: string;
  personneType: TypePersonnePresence;
}
export interface PresenceRequest {
  personneId: string;
  personneType: TypePersonnePresence;
  statut: StatutPresence;
  dureeRetardMin: number;
  justifie: boolean;
  pieceJustificative?: string | null;
}
