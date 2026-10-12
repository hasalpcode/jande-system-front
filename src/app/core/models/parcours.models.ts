export interface Classe {
  id: string;
  libelle: string;
  effectifMax: number;
  anneeAcademiqueId: string | null;
  anneeAcademiqueLibelle: string | null;
  anneeAcademiqueDateDebut: string | null;
  anneeAcademiqueDateFin: string | null;
  filiereAcademiqueId: string | null;
  filiereLibelle: string | null;
  mentionLibelle: string | null;
  domaineLibelle: string | null;
  niveauId: string | null;
  niveauLibelle: string | null;
}
export interface ClasseRequest {
  libelle: string;
  effectifMax: number;
  filiereAcademiqueId: string;
  niveauId: string;
  anneeAcademiqueId: string;
}

export type TypeUniteEnseignement = 'FONDAMENTAL' | 'TRANSVERSAL' | 'OPTIONNEL';
export const TYPES_UNITE_ENSEIGNEMENT: { type: TypeUniteEnseignement; label: string }[] = [
  { type: 'FONDAMENTAL', label: 'Fondamental' },
  { type: 'TRANSVERSAL', label: 'Transversal' },
  { type: 'OPTIONNEL', label: 'Optionnel' },
];

export interface UniteEnseignement {
  id: string;
  code: string;
  intitule: string;
  type: TypeUniteEnseignement;
  credits: number | null;
  semestreId: string | null;
  semestreLibelle: string | null;
  anneeAcademiqueId: string | null;
  anneeAcademiqueLibelle: string | null;
}
export interface UniteEnseignementRequest {
  code: string;
  intitule: string;
  type: TypeUniteEnseignement;
  semestreId: string;
  anneeAcademiqueId: string;
}

export interface ElementConstitutif {
  id: string;
  code: string;
  intitule: string;
  volumeHoraireCm: number;
  volumeHoraireTdTp: number;
  volumeHoraireTpe: number;
  volumeHoraireGlobal: number | null;
  /** Calculé côté serveur à partir du volume horaire global (20h = 1 crédit). */
  credits: number;
  /** Pondération dans la moyenne de l'UE - distincte du crédit (capitalisation). */
  coefficient: number;
}
export interface ElementConstitutifRequest {
  code: string;
  intitule: string;
  volumeHoraireCm: number;
  volumeHoraireTdTp: number;
  volumeHoraireTpe: number;
  coefficient: number;
  uniteEnseignementId: string;
}
