import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, of } from 'rxjs';
import { InscriptionsService } from '../../../core/services/inscriptions.service';
import { AnneeAcademique, Engagement, TYPES_ENGAGEMENT_PIVOT, TypeEngagement } from '../../../core/models/parametrage.models';
import { Classe } from '../../../core/models/parcours.models';
import { EcheancePrevueRequest, Etudiant, Inscription, STATUTS_INSCRIPTION } from '../../../core/models/inscriptions.models';

export interface InscriptionFormDialogData {
  /** Filtre la liste des classes proposées (choisi via le modal "Niveau" précédent) -
   * null en édition, où toutes les classes restent proposées. */
  niveauId: string | null;
  classes: Classe[];
  etudiants: Etudiant[];
  annees: AnneeAcademique[];
  engagements: Engagement[];
  /** Présent = édition ; absent = création. */
  inscription?: Inscription;
  /** Étudiant déjà choisi (depuis l'onglet "Étudiants non inscrits") - le champ Étudiant
   * est alors verrouillé plutôt que laissé au choix. Ignoré en édition. */
  etudiantPreselectionne?: Etudiant;
}

/** Index 0 = Janvier, ... 11 = Decembre - sert au select "Mois" du calendrier previsionnel. */
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

@Component({
  selector: 'app-inscription-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DecimalPipe,
  ],
  templateUrl: './inscription-form-dialog.html',
  styleUrl: './inscription-form-dialog.scss',
})
export class InscriptionFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly inscriptionsService = inject(InscriptionsService);
  private readonly dialogRef = inject(MatDialogRef<InscriptionFormDialog, Inscription>);
  readonly data = inject<InscriptionFormDialogData>(MAT_DIALOG_DATA);

  readonly mois = MOIS;
  readonly typesEngagementPivot = TYPES_ENGAGEMENT_PIVOT;
  readonly statutsInscription = STATUTS_INSCRIPTION;
  readonly enCours = signal(false);
  readonly chargementEcheances = signal(!!this.data.inscription);

  readonly enEdition = !!this.data.inscription;

  readonly classesProposees = computed(() => {
    const niveauId = this.data.niveauId;
    return niveauId ? this.data.classes.filter((c) => c.niveauId === niveauId) : this.data.classes;
  });

  readonly formInscription = this.fb.nonNullable.group({
    etudiantId: [
      this.data.inscription?.etudiant?.id ?? this.data.etudiantPreselectionne?.id ?? '',
      Validators.required,
    ],
    classeId: [this.data.inscription?.classe?.id ?? '', Validators.required],
    anneeAcademiqueId: [this.data.inscription?.anneeAcademique?.id ?? '', Validators.required],
    // Non envoye a la creation (POST force VALIDEE) - utilise seulement en edition.
    statut: this.fb.nonNullable.control(this.data.inscription?.statut ?? STATUTS_INSCRIPTION[0], Validators.required),
  });

  readonly formCalendrier = this.fb.nonNullable.group({
    nombreMensualites: [1, [Validators.required, Validators.min(1)]],
    lignes: this.fb.nonNullable.array<ReturnType<typeof this.creerLigneCalendrier>>([]),
  });

  private readonly classeIdChoisie = toSignal(this.formInscription.controls.classeId.valueChanges, {
    initialValue: this.formInscription.controls.classeId.value,
  });
  private readonly anneeIdChoisie = toSignal(this.formInscription.controls.anneeAcademiqueId.valueChanges, {
    initialValue: this.formInscription.controls.anneeAcademiqueId.value,
  });

  readonly classeChoisie = computed(() => this.data.classes.find((c) => c.id === this.classeIdChoisie()) ?? null);

  readonly niveauDeLaClasse = computed(() => {
    const classe = this.classeChoisie();
    return classe?.niveauId ? { id: classe.niveauId, libelle: classe.niveauLibelle } : null;
  });

  readonly engagementsDuNiveau = computed(() => {
    const niveau = this.niveauDeLaClasse();
    const anneeId = this.anneeIdChoisie();
    if (!niveau || !anneeId) return [];
    return this.data.engagements.filter((e) => e.niveauId === niveau.id && e.anneeAcademiqueId === anneeId);
  });

  /** Montants des engagements repris pour CETTE inscription uniquement : pre-remplis depuis
   * les parametres d'engagements du niveau, mais modifiables sans jamais ecrire dans
   * Engagement (parametrage) - seul le calendrier previsionnel de cette inscription
   * (EcheancePrevue) est impacte, via genererCalendrier(). */
  readonly formEngagements = this.fb.nonNullable.group(
    Object.fromEntries(TYPES_ENGAGEMENT_PIVOT.map((t) => [t.type, this.fb.nonNullable.control<number>(0)])) as Record<
      (typeof TYPES_ENGAGEMENT_PIVOT)[number]['type'],
      ReturnType<typeof this.fb.nonNullable.control<number>>
    >,
  );

  private readonly montantsEngagements = toSignal(this.formEngagements.valueChanges, {
    initialValue: this.formEngagements.getRawValue(),
  });

  readonly montantTotalEngagements = computed(() =>
    Object.values(this.montantsEngagements()).reduce((total: number, m) => total + (Number(m) || 0), 0),
  );

  constructor() {
    // Re-initialise les montants editables des engagements dès que le niveau/l'annee change -
    // ils restent de simples valeurs de depart pour CETTE inscription, jamais synchronisees
    // en retour vers Engagement (parametrage).
    effect(() => {
      const engagements = this.engagementsDuNiveau();
      this.formEngagements.patchValue(
        Object.fromEntries(TYPES_ENGAGEMENT_PIVOT.map((t) => [t.type, engagements.find((e) => e.type === t.type)?.montant ?? 0])),
      );
    });

    // La classe fixe deja son annee academique (Classe.anneeAcademiqueId) - on la reporte
    // automatiquement sur l'inscription plutot que de la faire ressaisir.
    this.formInscription.controls.classeId.valueChanges.subscribe((classeId) => {
      const classe = this.data.classes.find((c) => c.id === classeId);
      if (classe?.anneeAcademiqueId) {
        this.formInscription.controls.anneeAcademiqueId.setValue(classe.anneeAcademiqueId);
      }
      if (!this.enEdition) this.genererCalendrier();
    });

    if (this.data.inscription) {
      this.formInscription.controls.etudiantId.disable();
      this.inscriptionsService.listerEcheances(this.data.inscription.id).subscribe((echeances) => {
        this.lignesCalendrier.clear();
        for (const echeance of echeances) {
          const { anneeAcademiqueId, mois } = this.trouverAnneeEtMois(echeance.dateEcheance);
          this.lignesCalendrier.push(this.creerLigneCalendrier(anneeAcademiqueId, mois, echeance.type, echeance.montantPrevu));
        }
        this.chargementEcheances.set(false);
      });
    } else {
      // Étudiant déjà choisi depuis "Étudiants non inscrits" - pas de raison de le changer ici.
      if (this.data.etudiantPreselectionne) this.formInscription.controls.etudiantId.disable();
      this.genererCalendrier();
    }
  }

  get lignesCalendrier() {
    return this.formCalendrier.controls.lignes;
  }

  private creerLigneCalendrier(anneeAcademiqueId: string, mois: number, type: TypeEngagement, montantPrevu: number) {
    return this.fb.nonNullable.group({
      anneeAcademiqueId: [anneeAcademiqueId, Validators.required],
      mois: [mois, Validators.required],
      type: this.fb.nonNullable.control<TypeEngagement>(type, Validators.required),
      montantPrevu: [montantPrevu, Validators.required],
    });
  }

  /** Reconstruit le plan : le montant total des engagements du niveau, reparti a parts
   * egales sur le nombre de mensualites demande, a partir du mois de debut de l'annee de
   * la classe. Purement une proposition de depart - chaque ligne reste ensuite editable. */
  genererCalendrier(): void {
    const anneeId = this.classeChoisie()?.anneeAcademiqueId;
    if (!anneeId) {
      this.lignesCalendrier.clear();
      return;
    }
    const n = Math.max(1, this.formCalendrier.controls.nombreMensualites.value);
    const montantParMois = Math.round((this.montantTotalEngagements() / n) * 100) / 100;
    const typeParDefaut = this.engagementsDuNiveau()[0]?.type ?? TYPES_ENGAGEMENT_PIVOT[0].type;
    const annee = this.data.annees.find((a) => a.id === anneeId);
    const debut = annee ? new Date(annee.dateDebut).getMonth() : 0;

    this.lignesCalendrier.clear();
    for (let i = 0; i < n; i++) {
      const moisLigne = (debut + i) % 12;
      this.lignesCalendrier.push(this.creerLigneCalendrier(anneeId, moisLigne, typeParDefaut, montantParMois));
    }
  }

  ajouterLigneCalendrier(): void {
    const classe = this.classeChoisie();
    const anneeParDefaut = classe?.anneeAcademiqueId ?? this.data.annees[0]?.id ?? '';
    const typeParDefaut = this.engagementsDuNiveau()[0]?.type ?? TYPES_ENGAGEMENT_PIVOT[0].type;
    this.lignesCalendrier.push(this.creerLigneCalendrier(anneeParDefaut, 0, typeParDefaut, 0));
  }

  retirerLigneCalendrier(index: number): void {
    this.lignesCalendrier.removeAt(index);
  }

  /** Convertit (annee academique + mois 0-11) en date ISO (1er du mois) - le mois choisi
   * peut tomber sur l'annee civile de fin si l'annee academique chevauche deux annees
   * civiles (ex: annee academique demarrant en Septembre, mois "Janvier" -> annee civile+1). */
  private calculerDateEcheance(anneeAcademiqueId: string, mois: number): string {
    const annee = this.data.annees.find((a) => a.id === anneeAcademiqueId);
    if (!annee) {
      return new Date().toISOString().slice(0, 10);
    }
    const debut = new Date(annee.dateDebut);
    const anneeCivile = mois < debut.getMonth() ? debut.getFullYear() + 1 : debut.getFullYear();
    return new Date(Date.UTC(anneeCivile, mois, 1)).toISOString().slice(0, 10);
  }

  /** Sens inverse de calculerDateEcheance - reconstruit (annee academique + mois) a partir
   * d'une echeance existante, pour re-remplir le formulaire en edition. */
  private trouverAnneeEtMois(dateEcheance: string): { anneeAcademiqueId: string; mois: number } {
    const date = new Date(dateEcheance);
    const annee = this.data.annees.find((a) => date >= new Date(a.dateDebut) && date <= new Date(a.dateFin));
    return { anneeAcademiqueId: annee?.id ?? '', mois: date.getUTCMonth() };
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.formInscription.invalid) return this.formInscription.markAllAsTouched();
    if (this.formCalendrier.invalid) return this.formCalendrier.markAllAsTouched();

    const id = this.data.inscription?.id ?? null;
    const v = this.formInscription.getRawValue();
    const requete = id
      ? this.inscriptionsService.modifierInscription(id, {
          classeId: v.classeId,
          anneeAcademiqueId: v.anneeAcademiqueId,
          statut: v.statut,
        })
      : this.inscriptionsService.creerInscription({
          etudiantId: v.etudiantId,
          classeId: v.classeId,
          anneeAcademiqueId: v.anneeAcademiqueId,
        });

    this.enCours.set(true);
    requete.subscribe((inscription) => {
      const lignes: EcheancePrevueRequest[] = this.lignesCalendrier.controls.map((ligne) => {
        const lv = ligne.getRawValue();
        return {
          dateEcheance: this.calculerDateEcheance(lv.anneeAcademiqueId, lv.mois),
          type: lv.type,
          montantPrevu: lv.montantPrevu,
        };
      });
      const suite: Observable<unknown> =
        lignes.length > 0 ? this.inscriptionsService.enregistrerEcheances(inscription.id, lignes) : of(null);
      suite.subscribe(() => {
        this.enCours.set(false);
        this.dialogRef.close(inscription);
      });
    });
  }
}
