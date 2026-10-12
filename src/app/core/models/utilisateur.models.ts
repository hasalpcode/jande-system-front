export type RoleType = 'ADMIN' | 'ENSEIGNANT' | 'ETUDIANT' | 'COMPTABLE' | 'PARENT' | 'STAFF';

export const ROLE_TYPES: RoleType[] = ['ADMIN', 'ENSEIGNANT', 'ETUDIANT', 'COMPTABLE', 'PARENT', 'STAFF'];

export type Permission =
  | 'UTILISATEURS'
  | 'PARAMETRAGE'
  | 'PARCOURS'
  | 'INSCRIPTIONS'
  | 'PAIEMENTS'
  | 'STATISTIQUES'
  | 'COURS'
  | 'EVALUATIONS'
  | 'DOCUMENTS'
  | 'RH'
  | 'BADGEAGE'
  // Sous-permissions : Cours
  | 'COURS_AFFECTATIONS'
  | 'COURS_SEANCES'
  | 'COURS_REGISTRE'
  | 'COURS_PRESENCES'
  // Sous-permissions : Paramétrage
  | 'PARAMETRAGE_CREER'
  | 'PARAMETRAGE_MODIFIER'
  | 'PARAMETRAGE_SUPPRIMER'
  // Sous-permissions : Parcours
  | 'PARCOURS_CREER'
  | 'PARCOURS_MODIFIER'
  | 'PARCOURS_SUPPRIMER'
  // Sous-permissions : Inscriptions
  | 'INSCRIPTIONS_CREER'
  | 'INSCRIPTIONS_MODIFIER'
  | 'INSCRIPTIONS_SUPPRIMER'
  // Sous-permissions : Paiements
  | 'PAIEMENTS_CREER'
  | 'PAIEMENTS_MODIFIER'
  // Sous-permissions : Évaluations
  | 'EVALUATIONS_CREER'
  | 'EVALUATIONS_MODIFIER'
  | 'EVALUATIONS_SUPPRIMER'
  // Sous-permissions : Documents
  | 'DOCUMENTS_CREER'
  | 'DOCUMENTS_MODIFIER'
  | 'DOCUMENTS_SUPPRIMER'
  // Sous-permissions : RH
  | 'RH_CREER'
  // Sous-permissions : Utilisateurs
  | 'UTILISATEURS_CREER'
  | 'UTILISATEURS_MODIFIER';

/** Fonctionnalites cochables individuellement par l'admin pour un utilisateur, independamment de ses roles. */
export const PERMISSIONS: { value: Permission; label: string }[] = [
  { value: 'UTILISATEURS', label: 'Utilisateurs' },
  { value: 'PARAMETRAGE', label: 'Paramétrage' },
  { value: 'PARCOURS', label: 'Parcours' },
  { value: 'INSCRIPTIONS', label: 'Inscriptions' },
  { value: 'PAIEMENTS', label: 'Paiements' },
  { value: 'STATISTIQUES', label: 'Statistiques' },
  { value: 'COURS', label: 'Cours' },
  { value: 'EVALUATIONS', label: 'Évaluations' },
  { value: 'DOCUMENTS', label: 'Documents' },
  { value: 'RH', label: 'RH & Autres' },
  { value: 'BADGEAGE', label: 'Badgeage' },
];

/** Sous-permissions de chaque module, affichées dépliées sous sa case à cocher dans le
 * formulaire utilisateur - un module sans entrée ici (Statistiques, Badgeage) ne propose
 * que l'accès global. Dans Cours, un compte dont l'email correspond à celui d'un Professeur
 * existant est en plus automatiquement limité à ce qui le concerne (voir
 * AdminUserController), quelles que soient ces sous-permissions - rien à choisir ici. */
export const SOUS_PERMISSIONS: Record<string, { value: Permission; label: string }[]> = {
  COURS: [
    { value: 'COURS_AFFECTATIONS', label: 'Gérer les professeurs et les affectations' },
    { value: 'COURS_SEANCES', label: 'Ajouter une séance' },
    { value: 'COURS_REGISTRE', label: 'Modifier le registre (séances existantes)' },
    { value: 'COURS_PRESENCES', label: 'Marquer présent / absent / retard' },
  ],
  PARAMETRAGE: [
    { value: 'PARAMETRAGE_CREER', label: 'Ajouter' },
    { value: 'PARAMETRAGE_MODIFIER', label: 'Modifier' },
    { value: 'PARAMETRAGE_SUPPRIMER', label: 'Supprimer' },
  ],
  PARCOURS: [
    { value: 'PARCOURS_CREER', label: 'Ajouter' },
    { value: 'PARCOURS_MODIFIER', label: 'Modifier' },
    { value: 'PARCOURS_SUPPRIMER', label: 'Supprimer' },
  ],
  INSCRIPTIONS: [
    { value: 'INSCRIPTIONS_CREER', label: 'Ajouter' },
    { value: 'INSCRIPTIONS_MODIFIER', label: 'Modifier' },
    { value: 'INSCRIPTIONS_SUPPRIMER', label: 'Supprimer' },
  ],
  PAIEMENTS: [
    { value: 'PAIEMENTS_CREER', label: 'Enregistrer un paiement' },
    { value: 'PAIEMENTS_MODIFIER', label: 'Modifier une échéance' },
  ],
  EVALUATIONS: [
    { value: 'EVALUATIONS_CREER', label: 'Ajouter' },
    { value: 'EVALUATIONS_MODIFIER', label: 'Modifier' },
    { value: 'EVALUATIONS_SUPPRIMER', label: 'Supprimer' },
  ],
  DOCUMENTS: [
    { value: 'DOCUMENTS_CREER', label: 'Ajouter / générer' },
    { value: 'DOCUMENTS_MODIFIER', label: 'Modifier' },
    { value: 'DOCUMENTS_SUPPRIMER', label: 'Supprimer' },
  ],
  RH: [{ value: 'RH_CREER', label: 'Ajouter' }],
  UTILISATEURS: [
    { value: 'UTILISATEURS_CREER', label: 'Ajouter' },
    { value: 'UTILISATEURS_MODIFIER', label: 'Modifier' },
  ],
};

export interface Utilisateur {
  id: string;
  /** Genere a la creation du compte (voir AdminUserController) - identifie l'utilisateur
   * notamment sur les paiements qu'il enregistre. */
  code: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  roles: RoleType[];
  permissions: Permission[];
  actif: boolean;
  /** Présent si cet email correspond à celui d'un Professeur existant (voir
   * AdminUserController) : rattachement automatique, rien à choisir à la création - ce compte
   * est alors limité, dans Cours, à ses propres affectations/séances/présences. */
  professeurId: string | null;
  professeurNomComplet: string | null;
}

export interface CreerUtilisateurRequest {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  telephone?: string;
  roles: RoleType[];
  permissions: Permission[];
}

export interface ModifierUtilisateurRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  roles: RoleType[];
  permissions: Permission[];
  actif: boolean;
  professeurId?: string;
}
