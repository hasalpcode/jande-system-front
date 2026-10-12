import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageAcademiqueService } from '../../../core/services/parametrage-academique.service';
import { Niveau } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface NiveauFormDialogData {
  /** Pour déduire automatiquement l'ordre du nouveau niveau (nombre de niveaux déjà
   * existants + 1) - voir le constructeur. */
  niveaux: Niveau[];
  /** Présent = modification ; absent = ajout. */
  niveau?: Niveau;
}

@Component({
  selector: 'app-niveau-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './niveau-form-dialog.html',
  styleUrl: './niveau-form-dialog.scss',
})
export class NiveauFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<NiveauFormDialog, Niveau>);
  readonly data = inject<NiveauFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.niveau;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    libelle: [this.data.niveau?.libelle ?? '', Validators.required],
    // Plus saisi à la main : déduit du nombre de niveaux déjà créés (voir le constructeur).
    ordre: [this.data.niveau?.ordre ?? 0, Validators.required],
  });

  constructor() {
    // En édition, l'ordre existant est conservé tel quel.
    if (this.enEdition) return;
    this.form.controls.ordre.setValue(this.data.niveaux.length + 1);
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.niveau?.id;
    const appel = id ? this.academique.modifierNiveau(id, requete) : this.academique.creerNiveau(requete);
    appel.subscribe({
      next: (niveau) => {
        this.enCours.set(false);
        this.dialogRef.close(niveau);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
