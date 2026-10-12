export type TypeEtablissement = 'SCOLAIRE' | 'LMD' | 'MIXTE';

export interface Etablissement {
  id: string;
  code: string;
  nom: string;
  type: TypeEtablissement;
  adresse: string | null;
  actif: boolean;
  createdAt: string;
}

export interface CreerEtablissementRequest {
  nom: string;
  type: TypeEtablissement;
  adresse?: string;
  adminNom: string;
  adminPrenom: string;
  adminEmail: string;
  adminMotDePasse: string;
}
