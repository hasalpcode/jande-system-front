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
import { TYPES_UNITE_ENSEIGNEMENT, TypeUniteEnseignement, UniteEnseignement } from '../../../core/models/parcours.models';
import { AnneeAcademique, Semestre } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface UniteEnseignementFormDialogData {
  semestres: Semestre[];
  annees: AnneeAcademique[];
  /** Année académique déjà choisie dans la vue parente (étape 1 de Parcours) - présélectionnée,
   * et les semestres proposés sont alors restreints à ceux de cette année. */
  anneeAcademiqueIdParDefaut?: string;
  /** Présent = modification ; absent = ajout. */
  ue?: UniteEnseignement;
}

@Component({
  selector: 'app-unite-enseignement-form-dialog',
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
  templateUrl: './unite-enseignement-form-dialog.html',
  styleUrl: './unite-enseignement-form-dialog.scss',
})
export class UniteEnseignementFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly parcoursService = inject(ParcoursService);
  private readonly dialogRef = inject(MatDialogRef<UniteEnseignementFormDialog, UniteEnseignement>);
  readonly data = inject<UniteEnseignementFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.ue;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly typesUe = TYPES_UNITE_ENSEIGNEMENT;

  /** Restreints à l'année présélectionnée quand on vient de la vue scopée de Parcours,
   * sinon la liste complète. */
  readonly semestresProposes = this.data.anneeAcademiqueIdParDefaut
    ? this.data.semestres.filter((s) => s.anneeAcademiqueId === this.data.anneeAcademiqueIdParDefaut)
    : this.data.semestres;

  readonly form = this.fb.nonNullable.group({
    code: [this.data.ue?.code ?? '', Validators.required],
    intitule: [this.data.ue?.intitule ?? '', Validators.required],
    type: this.fb.nonNullable.control<TypeUniteEnseignement>(this.data.ue?.type ?? 'FONDAMENTAL', Validators.required),
    semestreId: [this.data.ue?.semestreId ?? '', Validators.required],
    anneeAcademiqueId: [this.data.ue?.anneeAcademiqueId ?? this.data.anneeAcademiqueIdParDefaut ?? '', Validators.required],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.ue?.id;
    const appel = id ? this.parcoursService.modifierUniteEnseignement(id, requete) : this.parcoursService.creerUniteEnseignement(requete);
    appel.subscribe({
      next: (ue) => {
        this.enCours.set(false);
        this.dialogRef.close(ue);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
