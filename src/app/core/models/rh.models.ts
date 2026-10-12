export interface Depense {
  id: string;
  categorie: string;
  montant: number;
  date: string;
  justificatif: string | null;
  /** Photo ou PDF du justificatif, en data URI. */
  pieceJointe: string | null;
}
export interface DepenseRequest {
  categorie: string;
  montant: number;
  date?: string;
  justificatif?: string;
  pieceJointe?: string;
}

export interface DepotBudget {
  id: string;
  montant: number;
  date: string;
}
export interface DepotBudgetRequest {
  montant: number;
  date?: string;
}

export interface BudgetDepense {
  depots: DepotBudget[];
  totalDepose: number;
  totalDepenses: number;
  montantRestant: number;
}

export type TypeBadgeage = 'ENTREE' | 'SORTIE';
export const TYPES_BADGEAGE: TypeBadgeage[] = ['ENTREE', 'SORTIE'];

export interface Badgeage {
  id: string;
  dateHeure: string;
  type: TypeBadgeage;
}
export interface BadgeageRequest {
  professeurId: string;
  type: TypeBadgeage;
}

export interface ContratVacataire {
  id: string;
  tauxHoraire: number;
  dateDebut: string;
  dateFin: string | null;
}
export interface ContratVacataireRequest {
  professeurId: string;
  tauxHoraire: number;
  dateDebut: string;
  dateFin?: string;
}
