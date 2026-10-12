import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParcoursService } from '../../../core/services/parcours.service';
import { Classe } from '../../../core/models/parcours.models';
import { AnneeAcademique, FiliereAcademique, Niveau } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface ClasseFormDialogData {
  filieres: FiliereAcademique[];
  niveaux: Niveau[];
  annees: AnneeAcademique[];
  /** Présent = modification ; absent = ajout. */
  classe?: Classe;
  /** Année académique déjà choisie dans la vue parente (étape 1 de Parcours) - présélectionnée. */
  anneeAcademiqueIdParDefaut?: string;
}

@Component({
  selector: 'app-classe-form-dialog',
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
  templateUrl: './classe-form-dialog.html',
  styleUrl: './classe-form-dialog.scss',
})
export class ClasseFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly parcoursService = inject(ParcoursService);
  private readonly dialogRef = inject(MatDialogRef<ClasseFormDialog, Classe>);
  readonly data = inject<ClasseFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.classe;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    libelle: [this.data.classe?.libelle ?? '', Validators.required],
    effectifMax: [this.data.classe?.effectifMax ?? 40, Validators.required],
    filiereAcademiqueId: [this.data.classe?.filiereAcademiqueId ?? '', Validators.required],
    niveauId: [this.data.classe?.niveauId ?? '', Validators.required],
    anneeAcademiqueId: [this.data.classe?.anneeAcademiqueId ?? this.data.anneeAcademiqueIdParDefaut ?? '', Validators.required],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.classe?.id;
    const appel = id ? this.parcoursService.modifierClasse(id, requete) : this.parcoursService.creerClasse(requete);
    appel.subscribe({
      next: (classe) => {
        this.enCours.set(false);
        this.dialogRef.close(classe);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
