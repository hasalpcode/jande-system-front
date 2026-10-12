import { Sexe } from './inscriptions.models';
import { TypeEngagement } from './parametrage.models';

export interface InscriptionValidee {
  inscriptionId: string;
  etudiantId: string;
  matricule: string;
  nomComplet: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  sexe: Sexe | null;
  classeLibelle: string;
}

export type StatutEcheance = 'PAYEE' | 'PARTIELLE' | 'A_VENIR' | 'EN_RETARD';

export interface LigneCalendrier {
  echeancePrevueId: string;
  dateEcheance: string;
  type: TypeEngagement;
  montantPrevu: number;
  montantPaye: number;
  paiementId: string | null;
  datePaiement: string | null;
  modePaiementLibelle: string | null;
  numeroRecu: string | null;
  reference: string | null;
  utilisateurCode: string | null;
  statut: StatutEcheance;
}

export interface CalendrierInscription {
  inscriptionId: string;
  etudiantId: string;
  matricule: string;
  nomComplet: string;
  classeLibelle: string;
  totalPrevu: number;
  totalPaye: number;
  echeances: LigneCalendrier[];
}

export interface Paiement {
  id: string;
  montant: number;
  datePaiement: string;
  reference: string | null;
}
export interface PaiementRequest {
  echeancePrevueId: string;
  modePaiementId: string;
  montant: number;
  reference?: string;
}

export interface Pointage {
  id: string;
  dateHeure: string;
  poste: string | null;
}
export interface PointageRequest {
  numeroCarte: string;
  poste?: string;
}
