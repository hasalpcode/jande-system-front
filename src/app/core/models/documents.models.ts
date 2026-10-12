export type TypeDocument =
  | 'ATTESTATION_INSCRIPTION'
  | 'CERTIFICAT_SCOLARITE'
  | 'ATTESTATION_ADMISSIBILITE'
  | 'ATTESTATION_NON_RECLAMATION'
  | 'ATTESTATION_AUTHENTIFICATION';
export const TYPES_DOCUMENT: TypeDocument[] = [
  'ATTESTATION_INSCRIPTION',
  'CERTIFICAT_SCOLARITE',
  'ATTESTATION_ADMISSIBILITE',
  'ATTESTATION_NON_RECLAMATION',
  'ATTESTATION_AUTHENTIFICATION',
];

export interface TemplateDocument {
  id: string;
  type: TypeDocument;
  enTete: string | null;
  logo: string | null;
  /** Texte libre - la section "Informations étudiant" entre les deux n'est pas stockée,
   * elle est toujours régénérée depuis l'étudiant (nom, prénom, date et lieu de naissance). */
  sectionIntroduction: string | null;
  sectionConclusion: string | null;
}
export interface TemplateDocumentRequest {
  type: TypeDocument;
  enTete?: string;
  logo?: string;
  sectionIntroduction?: string;
  sectionConclusion?: string;
}

export interface DocumentGenere {
  id: string;
  numero: string;
  dateGeneration: string;
  fichierUrl: string | null;
}
export interface GenererDocumentRequest {
  etudiantId: string;
  type: TypeDocument;
}
