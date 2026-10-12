import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageAcademiqueService } from '../../../core/services/parametrage-academique.service';
import { AnneeAcademique, ReconductionResultat } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface ReconductionDialogData {
  annees: AnneeAcademique[];
}

@Component({
  selector: 'app-reconduction-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reconduction-dialog.html',
  styleUrl: './reconduction-dialog.scss',
})
export class ReconductionDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<ReconductionDialog, boolean>);
  readonly data = inject<ReconductionDialogData>(MAT_DIALOG_DATA);

  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  /** Non-null = la reconduction a réussi - on bascule sur l'écran de résumé plutôt que
   * de fermer directement, pour que l'admin voie ce qui a été recopié. */
  readonly resultat = signal<ReconductionResultat | null>(null);

  readonly form = this.fb.nonNullable.group({
    anneeSourceId: ['', Validators.required],
    anneeCibleId: ['', Validators.required],
  });

  fermer(): void {
    this.dialogRef.close(!!this.resultat());
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const { anneeSourceId, anneeCibleId } = this.form.getRawValue();
    if (anneeSourceId === anneeCibleId) {
      this.erreur.set("L'année source et l'année cible doivent être différentes.");
      return;
    }
    this.enCours.set(true);
    this.erreur.set(null);
    this.academique.reconduire({ anneeSourceId, anneeCibleId }).subscribe({
      next: (resultat) => {
        this.enCours.set(false);
        this.resultat.set(resultat);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "La reconduction a échoué, réessayez.");
      },
    });
  }
}
