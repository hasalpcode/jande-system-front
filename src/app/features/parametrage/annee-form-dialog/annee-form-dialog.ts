import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageAcademiqueService } from '../../../core/services/parametrage-academique.service';
import { AnneeAcademique } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface AnneeFormDialogData {
  /** Présent = modification ; absent = ajout. */
  annee?: AnneeAcademique;
}

@Component({
  selector: 'app-annee-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './annee-form-dialog.html',
  styleUrl: './annee-form-dialog.scss',
})
export class AnneeFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<AnneeFormDialog, AnneeAcademique>);
  readonly data = inject<AnneeFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.annee;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    libelle: [this.data.annee?.libelle ?? '', Validators.required],
    dateDebut: [this.data.annee?.dateDebut ?? '', Validators.required],
    dateFin: [this.data.annee?.dateFin ?? '', Validators.required],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.annee?.id;
    const appel = id ? this.academique.modifierAnnee(id, requete) : this.academique.creerAnnee(requete);
    appel.subscribe({
      next: (annee) => {
        this.enCours.set(false);
        this.dialogRef.close(annee);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
