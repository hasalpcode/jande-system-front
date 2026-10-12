import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageAcademiqueService } from '../../../core/services/parametrage-academique.service';
import { Domaine } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface DomaineFormDialogData {
  /** Présent = modification ; absent = ajout. */
  domaine?: Domaine;
}

@Component({
  selector: 'app-domaine-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './domaine-form-dialog.html',
  styleUrl: './domaine-form-dialog.scss',
})
export class DomaineFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<DomaineFormDialog, Domaine>);
  readonly data = inject<DomaineFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.domaine;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: [this.data.domaine?.code ?? '', Validators.required],
    libelle: [this.data.domaine?.libelle ?? '', Validators.required],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.domaine?.id;
    const appel = id ? this.academique.modifierDomaine(id, requete) : this.academique.creerDomaine(requete);
    appel.subscribe({
      next: (domaine) => {
        this.enCours.set(false);
        this.dialogRef.close(domaine);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
