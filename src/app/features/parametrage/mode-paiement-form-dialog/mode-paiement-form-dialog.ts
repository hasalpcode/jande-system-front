import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageFinancierService } from '../../../core/services/parametrage-financier.service';
import { ModePaiement, TYPES_MODE } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface ModePaiementFormDialogData {
  /** Présent = modification ; absent = ajout. */
  mode?: ModePaiement;
}

@Component({
  selector: 'app-mode-paiement-form-dialog',
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
  templateUrl: './mode-paiement-form-dialog.html',
  styleUrl: './mode-paiement-form-dialog.scss',
})
export class ModePaiementFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly financier = inject(ParametrageFinancierService);
  private readonly dialogRef = inject(MatDialogRef<ModePaiementFormDialog, ModePaiement>);
  readonly data = inject<ModePaiementFormDialogData>(MAT_DIALOG_DATA);

  readonly typesMode = TYPES_MODE;
  readonly enEdition = !!this.data.mode;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    libelle: [this.data.mode?.libelle ?? '', Validators.required],
    type: this.fb.nonNullable.control(this.data.mode?.type ?? TYPES_MODE[0], Validators.required),
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.mode?.id;
    const appel = id ? this.financier.modifierModePaiement(id, requete) : this.financier.creerModePaiement(requete);
    appel.subscribe({
      next: (mode) => {
        this.enCours.set(false);
        this.dialogRef.close(mode);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
