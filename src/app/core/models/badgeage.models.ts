import { StatutPresence } from './cours.models';

export interface BadgerRequest {
  numeroCarte: string;
  poste?: string;
}

export interface AbsenceNonJustifiee {
  date: string;
  statut: StatutPresence;
  seanceLibelle: string;
}

export interface BadgeageEtudiantResponse {
  etudiantId: string;
  matricule: string;
  nomComplet: string;
  classeLibelle: string;
  anneeAcademiqueId: string | null;
  anneeAcademiqueLibelle: string;
  aJourPaiement: boolean;
  montantRestant: number;
  /** null si aucune séance de cours n'a encore commencé aujourd'hui pour sa classe. */
  statutPresence: StatutPresence | null;
  dureeRetardMin: number | null;
  seanceLibelle: string | null;
  /** false s'il a au moins une absence/retard jamais justifié sur une séance de sa classe. */
  assiduiteAJour: boolean;
  absencesNonJustifiees: AbsenceNonJustifiee[];
  dateHeureBadge: string;
}
