import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EvaluationsService } from '../../../core/services/evaluations.service';
import { BulletinDetailResponse, MatiereResponse } from '../../../core/models/evaluations.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface MatiereFormDialogData {
  bulletinId: string;
  matiere: MatiereResponse;
  ueIntitule: string;
}

@Component({
  selector: 'app-matiere-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './matiere-form-dialog.html',
  styleUrl: './matiere-form-dialog.scss',
})
export class MatiereFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly evaluationsService = inject(EvaluationsService);
  private readonly dialogRef = inject(MatDialogRef<MatiereFormDialog, BulletinDetailResponse>);
  readonly data = inject<MatiereFormDialogData>(MAT_DIALOG_DATA);

  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    presence: [this.data.matiere.presence, Validators.required],
    cc: [this.data.matiere.cc !== null ? String(this.data.matiere.cc) : ''],
    examen: [this.data.matiere.examen !== null ? String(this.data.matiere.examen) : ''],
    rattrapage: [this.data.matiere.rattrapage !== null ? String(this.data.matiere.rattrapage) : ''],
    remarque: [this.data.matiere.remarque ?? ''],
  });

  private readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Même règle de pondération que le backend (voir EvaluationService.moyenneEc) - purement
   * indicatif, recalculé côté serveur à l'enregistrement. */
  readonly moyennePrevisionnelle = computed(() => {
    const v = this.valeurs();
    const rattrapage = v.rattrapage !== '' ? Number(v.rattrapage) : null;
    if (rattrapage !== null && !Number.isNaN(rattrapage)) return arrondi(rattrapage);
    const cc = v.cc !== '' ? Number(v.cc) : null;
    const examen = v.examen !== '' ? Number(v.examen) : null;
    if (cc !== null && examen !== null && !Number.isNaN(cc) && !Number.isNaN(examen)) return arrondi(cc * 0.4 + examen * 0.6);
    if (cc !== null && !Number.isNaN(cc)) return arrondi(cc);
    if (examen !== null && !Number.isNaN(examen)) return arrondi(examen);
    return null;
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    this.evaluationsService
      .ajouterMatiere(this.data.bulletinId, {
        elementConstitutifId: this.data.matiere.elementConstitutifId,
        cc: v.cc !== '' ? Number(v.cc) : undefined,
        examen: v.examen !== '' ? Number(v.examen) : undefined,
        rattrapage: v.rattrapage !== '' ? Number(v.rattrapage) : undefined,
        presence: v.presence,
        remarque: v.remarque || undefined,
      })
      .subscribe({
        next: (detail) => {
          this.enCours.set(false);
          this.dialogRef.close(detail);
        },
        error: (error: unknown) => {
          this.enCours.set(false);
          const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
          this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
        },
      });
  }
}

function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}
