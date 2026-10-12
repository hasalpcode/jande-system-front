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
import { FiliereAcademique, Option, TypeFiliere } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface FiliereFormDialogData {
  options: Option[];
  /** Présent = modification ; absent = ajout. */
  filiere?: FiliereAcademique;
}

@Component({
  selector: 'app-filiere-form-dialog',
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
  templateUrl: './filiere-form-dialog.html',
  styleUrl: './filiere-form-dialog.scss',
})
export class FiliereFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<FiliereFormDialog, FiliereAcademique>);
  readonly data = inject<FiliereFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.filiere;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: [this.data.filiere?.code ?? '', Validators.required],
    libelle: [this.data.filiere?.libelle ?? '', Validators.required],
    optionId: [this.data.filiere?.optionId ?? '', Validators.required],
    // Fixe a la creation - non modifiable ensuite (voir champ masque en edition dans le template).
    type: this.fb.nonNullable.control<TypeFiliere>('SPECIALITE', Validators.required),
    grade: [this.data.filiere?.grade ?? ''],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    const requete = { ...v, grade: v.grade || undefined };
    const id = this.data.filiere?.id;
    const appel = id ? this.academique.modifierFiliere(id, requete) : this.academique.creerFiliere(requete);
    appel.subscribe({
      next: (filiere) => {
        this.enCours.set(false);
        this.dialogRef.close(filiere);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
