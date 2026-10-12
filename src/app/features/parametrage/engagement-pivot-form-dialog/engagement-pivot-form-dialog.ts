import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, forkJoin, map, of } from 'rxjs';
import { ParametrageAcademiqueService } from '../../../core/services/parametrage-academique.service';
import { ParametrageFinancierService } from '../../../core/services/parametrage-financier.service';
import { Engagement, EngagementRequest, Niveau, TYPES_ENGAGEMENT_PIVOT } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface EngagementPivotFormDialogData {
  anneeId: string;
  niveaux: Niveau[];
  engagements: Engagement[];
  /** Présent = édition des montants d'UN niveau déjà paramétré ; absent = ajout (niveau
   * existant sans engagement, ou nouveau niveau créé à la volée). */
  niveauCible?: Niveau;
}

@Component({
  selector: 'app-engagement-pivot-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './engagement-pivot-form-dialog.html',
  styleUrl: './engagement-pivot-form-dialog.scss',
})
export class EngagementPivotFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly financier = inject(ParametrageFinancierService);
  private readonly dialogRef = inject(MatDialogRef<EngagementPivotFormDialog, boolean>);
  readonly data = inject<EngagementPivotFormDialogData>(MAT_DIALOG_DATA);

  readonly typesEngagementPivot = TYPES_ENGAGEMENT_PIVOT;
  readonly enEdition = !!this.data.niveauCible;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly niveauxDisponiblesPourAjout = computed(() =>
    this.data.niveaux.filter(
      (n) => !this.data.engagements.some((e) => e.niveauId === n.id && e.anneeAcademiqueId === this.data.anneeId),
    ),
  );

  private montantPour(niveauId: string, type: string): number {
    return (
      this.data.engagements.find((e) => e.niveauId === niveauId && e.anneeAcademiqueId === this.data.anneeId && e.type === type)
        ?.montant ?? 0
    );
  }

  readonly form = this.fb.nonNullable.group({
    niveauId: [this.data.niveauCible?.id ?? ''],
    nouveauNiveauLibelle: [''],
    montants: this.fb.nonNullable.group(
      Object.fromEntries(
        TYPES_ENGAGEMENT_PIVOT.map(({ type }) => [type, [this.data.niveauCible ? this.montantPour(this.data.niveauCible.id, type) : 0]]),
      ),
    ),
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    this.enCours.set(true);
    this.erreur.set(null);
    const anneeId = this.data.anneeId;
    const { niveauId, nouveauNiveauLibelle, montants } = this.form.getRawValue();
    const montantsParType = montants as Record<string, number>;

    const cible = this.data.niveauCible;
    const niveauId$: Observable<string | null> = cible
      ? of(cible.id)
      : nouveauNiveauLibelle.trim()
        ? this.academique.creerNiveau({ libelle: nouveauNiveauLibelle.trim(), ordre: this.data.niveaux.length }).pipe(map((n) => n.id))
        : of(niveauId || null);

    niveauId$.subscribe({
      next: (resolvedNiveauId) => {
        if (!resolvedNiveauId) {
          this.enCours.set(false);
          this.erreur.set('Choisissez un niveau existant ou saisissez-en un nouveau.');
          return;
        }
        const appels: Observable<unknown>[] = [];
        for (const { type, label } of this.typesEngagementPivot) {
          const montant = montantsParType[type] ?? 0;
          const existant = this.data.engagements.find(
            (e) => e.niveauId === resolvedNiveauId && e.anneeAcademiqueId === anneeId && e.type === type,
          );
          if (montant > 0) {
            const payload: EngagementRequest = {
              libelle: label,
              montant,
              type,
              anneeAcademiqueId: anneeId,
              niveauId: resolvedNiveauId,
              nombreEcheances: 1,
            };
            appels.push(existant ? this.financier.modifierEngagement(existant.id, payload) : this.financier.creerEngagement(payload));
          } else if (existant) {
            appels.push(this.financier.supprimerEngagement(existant.id));
          }
        }

        const suite: Observable<unknown> = appels.length > 0 ? forkJoin(appels) : of(null);
        suite.subscribe({
          next: () => {
            this.enCours.set(false);
            this.dialogRef.close(true);
          },
          error: (error: unknown) => {
            this.enCours.set(false);
            const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
            this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
          },
        });
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "La création du niveau a échoué.");
      },
    });
  }
}
