import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NationaliteService } from '../../../core/services/nationalite.service';
import { Nationalite } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface NationaliteFormDialogData {
  /** Présent = modification ; absent = ajout. */
  nationalite?: Nationalite;
}

@Component({
  selector: 'app-nationalite-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './nationalite-form-dialog.html',
  styleUrl: './nationalite-form-dialog.scss',
})
export class NationaliteFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly nationaliteService = inject(NationaliteService);
  private readonly dialogRef = inject(MatDialogRef<NationaliteFormDialog, Nationalite>);
  readonly data = inject<NationaliteFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.nationalite;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: [this.data.nationalite?.code ?? '', [Validators.required, Validators.maxLength(3)]],
    libelle: [this.data.nationalite?.libelle ?? '', Validators.required],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.nationalite?.id;
    const appel = id ? this.nationaliteService.modifier(id, requete) : this.nationaliteService.creer(requete);
    appel.subscribe({
      next: (nationalite) => {
        this.enCours.set(false);
        this.dialogRef.close(nationalite);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
