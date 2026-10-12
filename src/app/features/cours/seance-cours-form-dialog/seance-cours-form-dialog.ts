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
import { Affectation, SeanceCours, SeanceCoursRequest, TYPES_SEANCE } from '../../../core/models/cours.models';
import { Salle } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface SeanceCoursFormDialogData {
  affectations: Affectation[];
  salles: Salle[];
  /** Présent = affectation fixée par le contexte (depuis le registre d'une affectation) -
   * le champ Affectation est alors verrouillé plutôt que laissé au choix. */
  affectationFixee?: Affectation;
  /** Présent = modification ; absent = ajout. */
  seance?: SeanceCours;
}

@Component({
  selector: 'app-seance-cours-form-dialog',
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
  templateUrl: './seance-cours-form-dialog.html',
  styleUrl: './seance-cours-form-dialog.scss',
})
export class SeanceCoursFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly coursService = inject(CoursService);
  private readonly dialogRef = inject(MatDialogRef<SeanceCoursFormDialog, SeanceCours>);
  readonly data = inject<SeanceCoursFormDialogData>(MAT_DIALOG_DATA);

  readonly typesSeance = TYPES_SEANCE;
  readonly enEdition = !!this.data.seance;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    affectationId: [this.data.seance?.affectation?.id ?? this.data.affectationFixee?.id ?? '', Validators.required],
    date: [this.data.seance?.date ?? '', Validators.required],
    heureDebut: [this.data.seance?.heureDebut ?? '', Validators.required],
    heureFin: [this.data.seance?.heureFin ?? '', Validators.required],
    salleId: [this.data.seance?.salle?.id ?? ''],
    type: [this.data.seance?.type ?? ''],
    contenu: [this.data.seance?.contenu ?? ''],
  });

  constructor() {
    if (this.data.affectationFixee) this.form.controls.affectationId.disable();
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    const requete: SeanceCoursRequest = {
      affectationId: v.affectationId,
      date: v.date,
      heureDebut: v.heureDebut,
      heureFin: v.heureFin,
      salleId: v.salleId || undefined,
      type: (v.type || undefined) as never,
      contenu: v.contenu || undefined,
    };
    const id = this.data.seance?.id;
    const appel = id ? this.coursService.modifierSeance(id, requete) : this.coursService.creerSeance(requete);
    appel.subscribe({
      next: (seance) => {
        this.enCours.set(false);
        this.dialogRef.close(seance);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
