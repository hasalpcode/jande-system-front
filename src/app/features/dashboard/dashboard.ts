import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Etudiant } from '../../core/models/inscriptions.models';
import { Nationalite } from '../../core/models/parametrage.models';
import { CoursService } from '../../core/services/cours.service';
import { InscriptionsService } from '../../core/services/inscriptions.service';
import { NationaliteService } from '../../core/services/nationalite.service';
import { PaiementsService } from '../../core/services/paiements.service';
import { ParametrageAcademiqueService } from '../../core/services/parametrage-academique.service';
import { ParcoursService } from '../../core/services/parcours.service';
import { UtilisateurService } from '../../core/services/utilisateur.service';

interface StatTile {
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface NationaliteStat {
  code: string;
  libelle: string;
  count: number;
  percent: number;
  color: string;
  dasharray: string;
  dashoffset: number;
}

const NATIONALITE_INCONNUE = '__inconnue__';
const NATIONALITE_AUTRES = '__autres__';
const MAX_SLOTS_NATIONALITE = 7;

// Palette catégorielle validée (ordre fixe requis pour la distinction daltonien) — voir skill dataviz.
const CATEGORICAL_PALETTE = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
];
const NEUTRAL_COLOR = '#898781';

const DONUT_RADIUS = 40;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function computeNationaliteStats(etudiants: Etudiant[], nationalites: Nationalite[]): NationaliteStat[] {
  const libelleByCode = new Map(nationalites.map((n) => [n.code, n.libelle]));

  const counts = new Map<string, number>();
  for (const e of etudiants) {
    const key = e.nationaliteCode ?? NATIONALITE_INCONNUE;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let groups = Array.from(counts.entries()).map(([code, count]) => ({
    code,
    libelle: code === NATIONALITE_INCONNUE ? 'Non renseignée' : (libelleByCode.get(code) ?? code),
    count,
  }));
  groups.sort((a, b) => b.count - a.count);

  if (groups.length > MAX_SLOTS_NATIONALITE + 1) {
    const connues = groups.filter((g) => g.code !== NATIONALITE_INCONNUE);
    const inconnue = groups.find((g) => g.code === NATIONALITE_INCONNUE);
    const gardees = connues.slice(0, MAX_SLOTS_NATIONALITE);
    const reste = connues.slice(MAX_SLOTS_NATIONALITE);
    const autresCount = reste.reduce((sum, g) => sum + g.count, 0);
    groups = [
      ...gardees,
      ...(inconnue ? [inconnue] : []),
      ...(autresCount > 0 ? [{ code: NATIONALITE_AUTRES, libelle: 'Autres', count: autresCount }] : []),
    ];
    groups.sort((a, b) => b.count - a.count);
  }

  const total = etudiants.length || 1;
  let cumulativeFraction = 0;
  let colorIndex = 0;

  return groups.map((g) => {
    const fraction = g.count / total;
    const isSpecial = g.code === NATIONALITE_INCONNUE || g.code === NATIONALITE_AUTRES;
    const color = isSpecial ? NEUTRAL_COLOR : CATEGORICAL_PALETTE[colorIndex++ % CATEGORICAL_PALETTE.length];
    const stat: NationaliteStat = {
      code: g.code,
      libelle: g.libelle,
      count: g.count,
      percent: Math.round(fraction * 1000) / 10,
      color,
      dasharray: `${fraction * DONUT_CIRCUMFERENCE} ${DONUT_CIRCUMFERENCE}`,
      dashoffset: -(cumulativeFraction * DONUT_CIRCUMFERENCE),
    };
    cumulativeFraction += fraction;
    return stat;
  });
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly inscriptionsService = inject(InscriptionsService);
  private readonly paiementsService = inject(PaiementsService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly utilisateurService = inject(UtilisateurService);
  private readonly nationaliteService = inject(NationaliteService);
  private readonly coursService = inject(CoursService);
  private readonly academiqueService = inject(ParametrageAcademiqueService);

  readonly session = this.authService.currentSession;

  readonly statTiles = signal<StatTile[]>([]);
  readonly nationaliteStats = signal<NationaliteStat[]>([]);
  readonly nbEtudiantsPourDonut = signal<number | null>(null);

  /** Chaque appel est isolé par un catchError plutôt qu'un seul gros forkJoin qui échoue en
   * bloc : un profil restreint (comptable, enseignant...) n'a quasiment jamais toutes les
   * permissions à la fois, et un unique 403 sur l'une des huit sources ne doit pas vider le
   * tableau de bord en entier - seules les tuiles couvertes par une permission détenue sont
   * ensuite affichées (voir le filtrage par hasPermission plus bas), pas simplement celles
   * dont la requête a réussi, pour ne jamais afficher un zéro trompeur (plutôt l'absence de
   * tuile) sur une donnée à laquelle l'utilisateur n'a en réalité pas accès. */
  ngOnInit(): void {
    forkJoin({
      etudiants: this.inscriptionsService.listerEtudiants().pipe(catchError(() => of([]))),
      formulaires: this.inscriptionsService.listerFormulaires().pipe(catchError(() => of([]))),
      utilisateurs: this.utilisateurService.lister().pipe(catchError(() => of([]))),
      classes: this.parcoursService.listerClasses().pipe(catchError(() => of([]))),
      paiements: this.paiementsService.lister().pipe(catchError(() => of([]))),
      // Nationalites est desormais un referentiel du tenant (Parametrage), au meme titre
      // que Filieres ci-dessous - plus un referentiel global reserve a ROLE_ADMIN.
      nationalites: this.nationaliteService.listerPourAdmin().pipe(catchError(() => of([]))),
      professeurs: this.coursService.listerProfesseurs().pipe(catchError(() => of([]))),
      filieres: this.academiqueService.listerFilieres().pipe(catchError(() => of([]))),
    }).subscribe(({ etudiants, formulaires, utilisateurs, classes, paiements, nationalites, professeurs, filieres }) => {
      const maintenant = new Date();
      const totalEncaisse = paiements.reduce((total, p) => total + Number(p.montant), 0);
      const encaisseCeMois = paiements
        .filter((p) => {
          const d = new Date(p.datePaiement);
          return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear();
        })
        .reduce((total, p) => total + Number(p.montant), 0);
      const nbAdmis = formulaires.filter((f) => f.statut === 'ACCEPTE').length;
      const nbNationalitesUtilisees = new Set(etudiants.map((e) => e.nationaliteCode).filter(Boolean)).size;

      const tuiles: StatTile[] = [];
      if (this.authService.hasPermission('PAIEMENTS')) {
        tuiles.push(
          { label: 'Encaissé ce mois-ci', value: `${encaisseCeMois} CFA`, icon: 'payments', color: 'var(--module-paiements)' },
          { label: 'Total encaissé', value: `${totalEncaisse} CFA`, icon: 'account_balance_wallet', color: 'var(--module-statistiques)' },
        );
      }
      if (this.authService.hasPermission('INSCRIPTIONS')) {
        tuiles.push(
          { label: 'Étudiants admis', value: `${nbAdmis}`, icon: 'how_to_reg', color: 'var(--module-inscriptions)' },
          { label: 'Étudiants inscrits', value: `${etudiants.length}`, icon: 'groups', color: 'var(--module-parcours)' },
        );
      }
      if (this.authService.hasPermission('COURS')) {
        tuiles.push({ label: 'Professeurs', value: `${professeurs.length}`, icon: 'school', color: 'var(--module-cours)' });
      }
      if (this.authService.hasPermission('PARCOURS')) {
        tuiles.push({ label: 'Classes', value: `${classes.length}`, icon: 'meeting_room', color: 'var(--module-parametrage)' });
      }
      if (this.authService.hasPermission('PARAMETRAGE')) {
        tuiles.push({ label: 'Spécialités', value: `${filieres.length}`, icon: 'workspace_premium', color: 'var(--module-evaluations)' });
      }
      if (this.authService.hasPermission('PARAMETRAGE')) {
        tuiles.push({ label: 'Nationalités', value: `${nbNationalitesUtilisees}`, icon: 'public', color: 'var(--module-rh)' });
      }
      if (this.authService.hasPermission('UTILISATEURS')) {
        tuiles.push({ label: 'Utilisateurs', value: `${utilisateurs.length}`, icon: 'person', color: 'var(--module-documents)' });
      }
      this.statTiles.set(tuiles);

      if (this.authService.hasPermission('INSCRIPTIONS')) {
        this.nbEtudiantsPourDonut.set(etudiants.length);
        this.nationaliteStats.set(computeNationaliteStats(etudiants, nationalites));
      }
    });
  }
}
