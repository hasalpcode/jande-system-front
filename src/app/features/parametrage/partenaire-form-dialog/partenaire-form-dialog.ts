import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageFinancierService } from '../../../core/services/parametrage-financier.service';
import { Partenaire } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface PartenaireFormDialogData {
  /** Présent = modification ; absent = ajout. */
  partenaire?: Partenaire;
}

@Component({
  selector: 'app-partenaire-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './partenaire-form-dialog.html',
  styleUrl: './partenaire-form-dialog.scss',
})
export class PartenaireFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly financier = inject(ParametrageFinancierService);
  private readonly dialogRef = inject(MatDialogRef<PartenaireFormDialog, Partenaire>);
  readonly data = inject<PartenaireFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.partenaire;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nom: [this.data.partenaire?.nom ?? '', Validators.required],
    type: [this.data.partenaire?.type ?? ''],
    contact: [this.data.partenaire?.contact ?? ''],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    const requete = { nom: v.nom, type: v.type || undefined, contact: v.contact || undefined };
    const id = this.data.partenaire?.id;
    const appel = id ? this.financier.modifierPartenaire(id, requete) : this.financier.creerPartenaire(requete);
    appel.subscribe({
      next: (partenaire) => {
        this.enCours.set(false);
        this.dialogRef.close(partenaire);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
