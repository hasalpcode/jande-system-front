export interface BulletinResponse {
  id: string;
  dateGeneration: string;
  moyenneGenerale: number;
  creditsValides: number;
  creditsTotal: number;
  /** Tous les crédits du curriculum du semestre sont validés (chaque UE notée et validée) -
   * distinct de moyenneGenerale >= 10, qui ne porte que sur les UE déjà notées. */
  semestreValide: boolean;
  etudiantId: string;
  etudiantNomComplet: string;
  matricule: string;
  etudiantSexe: string | null;
  etudiantDateNaissance: string | null;
  etudiantLieuNaissance: string | null;
  semestreId: string;
  semestreLibelle: string;
  anneeAcademiqueId: string;
  anneeAcademiqueLibelle: string;
  classeId: string;
  classeLibelle: string;
  filiereLibelle: string | null;
  mentionLibelle: string | null;
  domaineLibelle: string | null;
  grade: string | null;
  appreciationConseilClasse: string | null;
}

export interface MatiereResponse {
  elementConstitutifId: string;
  intitule: string;
  credits: number;
  coefficient: number;
  cc: number | null;
  examen: number | null;
  rattrapage: number | null;
  moyenne: number | null;
  moyenneCoefficient: number | null;
  appreciation: string | null;
  presence: boolean;
  remarque: string | null;
}

export interface UniteEnseignementResponse {
  id: string;
  intitule: string;
  credits: number;
  moyenne: number | null;
  valide: boolean;
  matieres: MatiereResponse[];
}

export interface BulletinDetailResponse {
  bulletin: BulletinResponse;
  unitesEnseignement: UniteEnseignementResponse[];
}

export interface ElementConstitutifEnteteResponse {
  id: string;
  intitule: string;
}

export interface LigneEtudiantConseilResponse {
  etudiantId: string;
  nomComplet: string;
  matricule: string;
  /** Alignées sur l'ordre de UniteEnseignementConseilResponse.elementsConstitutifs - null si
   * l'étudiant n'a pas encore de note sur cet EC. */
  moyennesParEc: (number | null)[];
  moyenneUe: number | null;
  valide: boolean;
}

export interface UniteEnseignementConseilResponse {
  id: string;
  intitule: string;
  elementsConstitutifs: ElementConstitutifEnteteResponse[];
  etudiants: LigneEtudiantConseilResponse[];
}

export interface ConseilClasseResponse {
  classeId: string;
  classeLibelle: string;
  semestreId: string;
  semestreLibelle: string;
  unitesEnseignement: UniteEnseignementConseilResponse[];
}

export interface CreerBulletinRequest {
  etudiantId: string;
  classeId: string;
  semestreId: string;
}

export interface NoteMatiereRequest {
  elementConstitutifId: string;
  cc?: number;
  examen?: number;
  rattrapage?: number;
  presence: boolean;
  remarque?: string;
}

// ----- Saisie des notes par classe (+ import Excel) -----

export interface UniteEnseignementCurriculumResponse {
  ueId: string;
  ueIntitule: string;
  elementsConstitutifs: ElementConstitutifEnteteResponse[];
}

export interface LigneNoteClasseResponse {
  etudiantId: string;
  nomComplet: string;
  matricule: string;
  cc: number | null;
  examen: number | null;
  rattrapage: number | null;
  presence: boolean;
  remarque: string | null;
}

export interface SaisieNoteEtudiantRequest {
  etudiantId: string;
  cc?: number | null;
  examen?: number | null;
  rattrapage?: number | null;
  presence: boolean;
  remarque?: string | null;
}

export interface SaisirNotesClasseRequest {
  classeId: string;
  semestreId: string;
  elementConstitutifId: string;
  lignes: SaisieNoteEtudiantRequest[];
}

export interface ImportNotesClasseResponse {
  lignes: LigneNoteClasseResponse[];
  matriculesIgnores: string[];
}
