import { Permission } from '../../core/models/utilisateur.models';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  tint?: string;
  /** Permission requise (l'admin voit toujours tout). Absente = tout utilisateur tenant. */
  permission?: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
