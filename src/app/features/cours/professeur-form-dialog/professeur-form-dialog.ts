import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CoursService } from '../../../core/services/cours.service';
import { Professeur, ProfesseurRequest } from '../../../core/models/cours.models';
import { CIVILITES, SEXES, SITUATIONS_MATRIMONIALES } from '../../../core/models/inscriptions.models';
import { Nationalite } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface ProfesseurFormDialogData {
  nationalites: Nationalite[];
}

@Component({
  selector: 'app-professeur-form-dialog',
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
  templateUrl: './professeur-form-dialog.html',
  styleUrl: './professeur-form-dialog.scss',
})
export class ProfesseurFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly coursService = inject(CoursService);
  private readonly dialogRef = inject(MatDialogRef<ProfesseurFormDialog, Professeur>);
  readonly data = inject<ProfesseurFormDialogData>(MAT_DIALOG_DATA);

  readonly civilites = CIVILITES;
  readonly sexes = SEXES;
  readonly situationsMatrimoniales = SITUATIONS_MATRIMONIALES;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    civilite: [''],
    sexe: [''],
    situationMatrimoniale: [''],
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    titre: [''],
    specialite: [''],
    nationaliteCode: [''],
    adresse: [''],
    telephone: [''],
    email: [''],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    // Les champs optionnels vides valent '' dans le formulaire (mat-select sans
    // sélection) - un enum backend refuserait cette chaîne vide, donc on omet.
    const valeurs = this.form.getRawValue();
    const requete = Object.fromEntries(Object.entries(valeurs).filter(([, v]) => v !== '')) as unknown as ProfesseurRequest;
    this.coursService.creerProfesseur(requete).subscribe({
      next: (professeur) => {
        this.enCours.set(false);
        this.dialogRef.close(professeur);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
