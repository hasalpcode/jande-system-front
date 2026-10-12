import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CoursService } from '../../core/services/cours.service';
import { ParcoursService } from '../../core/services/parcours.service';
import { ParametrageAcademiqueService } from '../../core/services/parametrage-academique.service';
import { NationaliteService } from '../../core/services/nationalite.service';
import { Classe, ElementConstitutif, UniteEnseignement } from '../../core/models/parcours.models';
import { AnneeAcademique, Nationalite, Salle } from '../../core/models/parametrage.models';
import { Affectation, Presence, PresenceRequest, Professeur, SeanceCours, StatutPresence } from '../../core/models/cours.models';
import { Etudiant } from '../../core/models/inscriptions.models';
import { lireFichierEnDataUri, ouvrirDataUri } from '../../core/utils/data-uri';
import { AffectationFormDialog, AffectationFormDialogData } from './affectation-form-dialog/affectation-form-dialog';
import { ProfesseurFormDialog, ProfesseurFormDialogData } from './professeur-form-dialog/professeur-form-dialog';
import { SeanceCoursFormDialog, SeanceCoursFormDialogData } from './seance-cours-form-dialog/seance-cours-form-dialog';
import { SeanceCoursDetailDialog, SeanceCoursDetailDialogData } from './seance-cours-detail-dialog/seance-cours-detail-dialog';

@Component({
  selector: 'app-cours',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    DecimalPipe,
  ],
  templateUrl: './cours.html',
  styleUrl: './cours.scss',
})
export class CoursPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly authService = inject(AuthService);
  private readonly coursService = inject(CoursService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly nationaliteService = inject(NationaliteService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);


  readonly professeurs = signal<Professeur[]>([]);
  readonly nationalites = signal<Nationalite[]>([]);
  readonly affectations = signal<Affectation[]>([]);
  readonly seances = signal<SeanceCours[]>([]);
  readonly classes = signal<Classe[]>([]);
  readonly annees = signal<AnneeAcademique[]>([]);
  readonly ue = signal<UniteEnseignement[]>([]);
  readonly ec = signal<ElementConstitutif[]>([]);
  readonly salles = signal<Salle[]>([]);
  readonly presencesParSeance = signal<Record<string, Presence[]>>({});
  readonly seanceOuverte = signal<string | null>(null);
  readonly chargement = signal(true);

  /** Année choisie via "Voir groupes" - distincte de la sélection du <mat-select> pour ne
   * filtrer qu'au clic, comme sur la plateforme de référence. */
  readonly anneeAffichee = signal<string | null>(null);
  readonly anneeAfficheeSelectionnee = computed(() => this.annees().find((a) => a.id === this.anneeAffichee()) ?? null);
  /** Groupe (classe) sur lequel on a cliqué "Affectations" - null = liste complète des groupes. */
  readonly groupeSelectionne = signal<Classe | null>(null);

  readonly groupesDeLAnnee = computed(() => this.classes().filter((c) => c.anneeAcademiqueId === this.anneeAffichee()));
  readonly groupesAffiches = computed(() => {
    const groupe = this.groupeSelectionne();
    return groupe ? [groupe] : this.groupesDeLAnnee();
  });
  readonly affectationsDuGroupe = computed(() => {
    const groupe = this.groupeSelectionne();
    return groupe ? this.affectations().filter((a) => a.classe?.id === groupe.id) : [];
  });

  /** Affectation dont on consulte le registre de cours (séances + contenu enseigné) - null
   * = pas de registre ouvert, on reste sur la liste des affectations du groupe. */
  readonly registreSelectionne = signal<Affectation | null>(null);
  readonly seancesDeLAffectation = computed(() => {
    const affectation = this.registreSelectionne();
    return affectation ? this.seances().filter((s) => s.affectation?.id === affectation.id) : [];
  });

  readonly formAnnee = this.fb.nonNullable.group({
    anneeAcademiqueId: [''],
  });

  /** Effectif de la classe de chaque séance ouverte, mis en cache par classeId pour éviter
   * de le recharger si plusieurs séances de la même classe sont ouvertes tour à tour. */
  readonly rosterParClasse = signal<Record<string, Etudiant[]>>({});

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    // Un compte lié à un Professeur (voir Utilisateur.professeur) n'a souvent ni PARCOURS ni
    // PARAMETRAGE - années/salles/classes/UE restent lisibles pour lui (voir SecurityConfig,
    // carve-out GET) mais chaque branche est quand même isolée : une erreur inattendue sur
    // l'une ne doit pas empêcher les autres de s'afficher.
    forkJoin({
      professeurs: this.coursService.listerProfesseurs().pipe(catchError(() => of([]))),
      affectations: this.coursService.listerAffectations().pipe(catchError(() => of([]))),
      seances: this.coursService.listerSeances().pipe(catchError(() => of([]))),
      classes: this.parcoursService.listerClasses().pipe(catchError(() => of([]))),
      annees: this.academique.listerAnnees().pipe(catchError(() => of([]))),
      ue: this.parcoursService.listerUnitesEnseignement().pipe(catchError(() => of([]))),
      salles: this.academique.listerSalles().pipe(catchError(() => of([]))),
      nationalites: this.nationaliteService.listerPourAdmin().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (r) => {
        this.professeurs.set(r.professeurs);
        this.affectations.set(r.affectations);
        this.seances.set(r.seances);
        this.classes.set(r.classes);
        this.annees.set(r.annees);
        this.ue.set(r.ue);
        this.salles.set(r.salles);
        this.nationalites.set(r.nationalites);
        this.chargement.set(false);
        // this.ec accumule les éléments constitutifs de chaque UE au fil des requêtes :
        // sans ce reset, un rechargement (charger() est rappelé après chaque action) les
        // ajoutait une seconde fois, dupliquant les options du <mat-select>.
        this.ec.set([]);
        r.ue.forEach((u) => this.parcoursService.listerElementsConstitutifs(u.id).subscribe((ecs) => this.ec.update((l) => [...l, ...ecs])));
        // Le groupe et l'affectation affichés doivent rester en phase avec les listes rechargées.
        const groupe = this.groupeSelectionne();
        if (groupe) this.groupeSelectionne.set(r.classes.find((c) => c.id === groupe.id) ?? null);
        const affectation = this.registreSelectionne();
        if (affectation) this.registreSelectionne.set(r.affectations.find((a) => a.id === affectation.id) ?? null);
      },
      error: () => this.chargement.set(false),
    });
  }

  voirGroupes(): void {
    this.groupeSelectionne.set(null);
    this.anneeAffichee.set(this.formAnnee.controls.anneeAcademiqueId.value || null);
  }

  selectionnerGroupe(groupe: Classe): void {
    this.groupeSelectionne.set(groupe);
  }

  retourGroupes(): void {
    this.groupeSelectionne.set(null);
  }

  ouvrirAjoutProfesseur(): void {
    const ref = this.dialog.open<ProfesseurFormDialog, ProfesseurFormDialogData, Professeur>(ProfesseurFormDialog, {
      width: '760px',
      maxWidth: '95vw',
      data: { nationalites: this.nationalites() },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open('Professeur ajouté', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  ouvrirAjoutAffectation(): void {
    const groupe = this.groupeSelectionne();
    if (!groupe) return;
    this.ouvrirFormulaireAffectation(groupe, undefined);
  }

  ouvrirEditionAffectation(affectation: Affectation): void {
    const groupe = this.groupeSelectionne();
    if (!groupe) return;
    this.ouvrirFormulaireAffectation(groupe, affectation);
  }

  private ouvrirFormulaireAffectation(classe: Classe, affectation: Affectation | undefined): void {
    const ref = this.dialog.open<AffectationFormDialog, AffectationFormDialogData, Affectation>(AffectationFormDialog, {
      width: '680px',
      maxWidth: '95vw',
      data: { classe, elementsConstitutifs: this.ec(), professeurs: this.professeurs(), affectation },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(affectation ? 'Affectation modifiée' : 'Affectation ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerAffectation(affectation: Affectation): void {
    if (!confirm("Supprimer cette affectation de module ?")) return;
    this.coursService.supprimerAffectation(affectation.id).subscribe({
      next: () => {
        this.snackBar.open('Affectation supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      // Même convention que supprimerInscription : une 409 signifie ici des séances
      // encore liées à l'affectation (FK non nulle sur seance_cours.affectation_id).
      error: () =>
        this.snackBar.open("Suppression impossible : des séances sont liées à cette affectation.", 'OK', { duration: 4000 }),
    });
  }

  // ----- Registre de cours (séances d'une affectation, avec leur contenu enseigné) -----

  ouvrirRegistre(affectation: Affectation): void {
    this.registreSelectionne.set(affectation);
  }

  retourAffectations(): void {
    this.registreSelectionne.set(null);
  }

  /** Résumé affiché dans le tableau - le contenu complet reste consultable via "Voir". */
  contenuTronque(contenu: string): string {
    return contenu.length > 100 ? contenu.slice(0, 100) + '…' : contenu;
  }

  /** Duree en heures (decimale) entre deux heures "HH:mm[:ss]". */
  private dureeHeures(heureDebut: string, heureFin: string): number {
    const versMinutes = (h: string) => {
      const [heures, minutes] = h.split(':').map(Number);
      return heures * 60 + minutes;
    };
    return Math.max(0, (versMinutes(heureFin) - versMinutes(heureDebut)) / 60);
  }

  /** Heures deja retranchees du volume horaire prevu de l'affectation, au fil des séances
   * enregistrees - plafonnees au volume horaire prevu : une fois l'égalité atteinte, les
   * séances suivantes restent enregistrables dans le registre, mais leurs horaires ne sont
   * plus pris en compte dans le décompte (jamais de dépassement affiché). */
  heuresConsommees(affectation: Affectation): number {
    const total = this.seances()
      .filter((s) => s.affectation?.id === affectation.id)
      .reduce((somme, s) => somme + this.dureeHeures(s.heureDebut, s.heureFin), 0);
    return Math.min(total, affectation.volumeHorairePrevu);
  }

  heuresRestantes(affectation: Affectation): number {
    return Math.max(0, affectation.volumeHorairePrevu - this.heuresConsommees(affectation));
  }

  ouvrirDetailSeance(seance: SeanceCours): void {
    this.dialog.open<SeanceCoursDetailDialog, SeanceCoursDetailDialogData>(SeanceCoursDetailDialog, {
      width: '640px',
      maxWidth: '95vw',
      data: { seance },
    });
  }

  /** affectationFixee : passé uniquement depuis le registre d'une affectation, pour
   * verrouiller le champ Affectation - absent depuis l'onglet "Séances & présences", où
   * l'affectation reste au choix même si un registre est resté ouvert dans un autre onglet. */
  ouvrirAjoutSeance(affectationFixee?: Affectation): void {
    this.ouvrirFormulaireSeance(undefined, affectationFixee);
  }

  ouvrirEditionSeance(seance: SeanceCours): void {
    this.ouvrirFormulaireSeance(seance, undefined);
  }

  private ouvrirFormulaireSeance(seance: SeanceCours | undefined, affectationFixee: Affectation | undefined): void {
    const ref = this.dialog.open<SeanceCoursFormDialog, SeanceCoursFormDialogData, SeanceCours>(SeanceCoursFormDialog, {
      width: '680px',
      maxWidth: '95vw',
      data: { affectations: this.affectations(), salles: this.salles(), affectationFixee, seance },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(seance ? 'Séance modifiée' : 'Séance ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerSeance(seance: SeanceCours): void {
    if (!confirm('Supprimer cette séance ?')) return;
    this.coursService.supprimerSeance(seance.id).subscribe({
      next: () => {
        this.snackBar.open('Séance supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('La suppression a échoué, réessayez.', 'OK', { duration: 4000 }),
    });
  }

  basculerSeance(seance: SeanceCours): void {
    if (this.seanceOuverte() === seance.id) {
      this.seanceOuverte.set(null);
      return;
    }
    this.seanceOuverte.set(seance.id);
    this.rechargerPresences(seance.id);

    const classeId = seance.affectation?.classe?.id;
    if (classeId && !this.rosterParClasse()[classeId]) {
      this.parcoursService.listerEtudiantsDeClasse(classeId).subscribe((etudiants) => {
        this.rosterParClasse.update((m) => ({ ...m, [classeId]: etudiants }));
      });
    }
  }

  /** Effectif de la classe de la séance - vide tant que la séance n'est pas rattachée à
   * une classe connue (affectation non chargée, ou pas encore ouverte). */
  rosterDeSeance(seance: SeanceCours): Etudiant[] {
    const classeId = seance.affectation?.classe?.id;
    return classeId ? (this.rosterParClasse()[classeId] ?? []) : [];
  }

  private rechargerPresences(seanceId: string): void {
    this.coursService.listerPresences(seanceId).subscribe((presences) => {
      this.presencesParSeance.update((m) => ({ ...m, [seanceId]: presences }));
    });
  }

  private presenceDe(seanceId: string, etudiantId: string): Presence | undefined {
    return (this.presencesParSeance()[seanceId] ?? []).find((p) => p.personneId === etudiantId);
  }

  statutDe(seanceId: string, etudiantId: string): StatutPresence | null {
    return this.presenceDe(seanceId, etudiantId)?.statut ?? null;
  }

  retardMinDe(seanceId: string, etudiantId: string): number {
    return this.presenceDe(seanceId, etudiantId)?.dureeRetardMin ?? 0;
  }

  justifieDe(seanceId: string, etudiantId: string): boolean {
    return this.presenceDe(seanceId, etudiantId)?.justifie ?? false;
  }

  pieceDe(seanceId: string, etudiantId: string): string | null {
    return this.presenceDe(seanceId, etudiantId)?.pieceJustificative ?? null;
  }

  /** Marquer présent/absent/retard réenregistre le même relevé (upsert côté serveur) plutôt
   * que d'en empiler un nouveau à chaque clic. Justification et pièce jointe sont reprises
   * telles quelles - le remplacement complet côté serveur (pas de patch partiel) exige de
   * toujours les repasser, sans quoi un simple changement de statut les effacerait. */
  marquerPresence(seanceId: string, etudiantId: string, statut: StatutPresence, dureeRetardMin = 0): void {
    this.enregistrerPresence(seanceId, etudiantId, {
      statut,
      dureeRetardMin,
      justifie: this.justifieDe(seanceId, etudiantId),
      pieceJustificative: this.pieceDe(seanceId, etudiantId),
    });
  }

  /** Coche/décoche "Justifié" pour une absence/un retard déjà relevé - sans objet tant
   * qu'aucun statut n'est encore enregistré pour cet étudiant sur cette séance. */
  basculerJustification(seanceId: string, etudiantId: string, justifie: boolean): void {
    const statut = this.statutDe(seanceId, etudiantId);
    if (!statut) return;
    this.enregistrerPresence(seanceId, etudiantId, {
      statut,
      dureeRetardMin: this.retardMinDe(seanceId, etudiantId),
      justifie,
      pieceJustificative: this.pieceDe(seanceId, etudiantId),
    });
  }

  selectionnerPieceJustificative(seanceId: string, etudiantId: string, event: Event): void {
    const fichier = (event.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    const statut = this.statutDe(seanceId, etudiantId);
    if (!statut) return;
    lireFichierEnDataUri(
      fichier,
      (dataUri) =>
        this.enregistrerPresence(seanceId, etudiantId, {
          statut,
          dureeRetardMin: this.retardMinDe(seanceId, etudiantId),
          justifie: this.justifieDe(seanceId, etudiantId),
          pieceJustificative: dataUri,
        }),
      () => this.snackBar.open('Fichier trop volumineux (2 Mo max), choisissez-en un plus léger.', 'OK', { duration: 4000 }),
    );
  }

  retirerPieceJustificative(seanceId: string, etudiantId: string): void {
    const statut = this.statutDe(seanceId, etudiantId);
    if (!statut) return;
    this.enregistrerPresence(seanceId, etudiantId, {
      statut,
      dureeRetardMin: this.retardMinDe(seanceId, etudiantId),
      justifie: this.justifieDe(seanceId, etudiantId),
      pieceJustificative: null,
    });
  }

  voirPieceJustificative(seanceId: string, etudiantId: string): void {
    const piece = this.pieceDe(seanceId, etudiantId);
    if (piece) ouvrirDataUri(piece);
  }

  private enregistrerPresence(
    seanceId: string,
    etudiantId: string,
    v: Pick<PresenceRequest, 'statut' | 'dureeRetardMin' | 'justifie' | 'pieceJustificative'>,
  ): void {
    this.coursService
      .releverPresence(seanceId, { personneId: etudiantId, personneType: 'ETUDIANT', ...v })
      .subscribe(() => this.rechargerPresences(seanceId));
  }
}
