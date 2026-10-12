export interface SituationEtudiant {
  etudiantId: string;
  matricule: string;
  nomComplet: string;
  totalDu: number;
  totalPaye: number;
  solde: number;
}

export interface LigneClasse {
  etudiantId: string;
  inscriptionId: string;
  matricule: string;
  nomComplet: string;
  totalDu: number;
  totalPaye: number;
  solde: number;
}

export interface SituationClasse {
  classeId: string;
  classeLibelle: string;
  totalDuClasse: number;
  totalPayeClasse: number;
  soldeClasse: number;
  etudiants: LigneClasse[];
}

export interface LigneImpayeMensuel {
  etudiantId: string;
  inscriptionId: string;
  matricule: string;
  nomComplet: string;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  montantPrevu: number;
  montantPaye: number;
  montantRestant: number;
}

export interface ImpayesMensuel {
  annee: number;
  mois: number;
  totalEngagement: number;
  totalPaye: number;
  resteAPayer: number;
  lignes: LigneImpayeMensuel[];
}

export interface LigneSituationMensuelle {
  etudiantId: string;
  inscriptionId: string;
  matricule: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  genre: string | null;
}

export interface SituationMensuelleClasse {
  classeId: string;
  classeLibelle: string;
  annee: number;
  mois: number;
  payants: LigneSituationMensuelle[];
  nonPayants: LigneSituationMensuelle[];
}

export interface LigneBrouillard {
  paiementId: string;
  datePaiement: string;
  etudiantNomComplet: string;
  matricule: string;
  engagementLibelle: string;
  modePaiementLibelle: string;
  montant: number;
  reference: string | null;
  numeroRecu: string | null;
}
