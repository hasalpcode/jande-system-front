import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageAcademiqueService } from '../../../core/services/parametrage-academique.service';
import { Salle, TYPES_SALLE } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface SalleFormDialogData {
  /** Présent = modification ; absent = ajout. */
  salle?: Salle;
}

@Component({
  selector: 'app-salle-form-dialog',
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
  templateUrl: './salle-form-dialog.html',
  styleUrl: './salle-form-dialog.scss',
})
export class SalleFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<SalleFormDialog, Salle>);
  readonly data = inject<SalleFormDialogData>(MAT_DIALOG_DATA);

  readonly typesSalle = TYPES_SALLE;
  readonly enEdition = !!this.data.salle;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: [this.data.salle?.code ?? '', Validators.required],
    libelle: [this.data.salle?.libelle ?? '', Validators.required],
    capacite: [this.data.salle?.capacite ?? 30, Validators.required],
    type: this.fb.nonNullable.control(this.data.salle?.type ?? TYPES_SALLE[0], Validators.required),
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.salle?.id;
    const appel = id ? this.academique.modifierSalle(id, requete) : this.academique.creerSalle(requete);
    appel.subscribe({
      next: (salle) => {
        this.enCours.set(false);
        this.dialogRef.close(salle);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
