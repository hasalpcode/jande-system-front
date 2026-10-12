import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageAcademiqueService } from '../../../core/services/parametrage-academique.service';
import { AnneeAcademique, Semestre } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface SemestreFormDialogData {
  annees: AnneeAcademique[];
  /** Pour déduire automatiquement l'ordre du nouveau semestre (nombre de semestres déjà
   * existants + 1 pour l'année choisie) - voir le constructeur. */
  semestres: Semestre[];
  /** Présent = modification ; absent = ajout. */
  semestre?: Semestre;
}

@Component({
  selector: 'app-semestre-form-dialog',
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
  templateUrl: './semestre-form-dialog.html',
  styleUrl: './semestre-form-dialog.scss',
})
export class SemestreFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<SemestreFormDialog, Semestre>);
  readonly data = inject<SemestreFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.semestre;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    libelle: [this.data.semestre?.libelle ?? '', Validators.required],
    // Plus saisi à la main : déduit du nombre de semestres déjà créés pour l'année choisie
    // (voir le constructeur) - seul l'ordre d'ajout compte, pas un numéro à retenir.
    ordre: [this.data.semestre?.ordre ?? 1, Validators.required],
    dateDebut: [this.data.semestre?.dateDebut ?? '', Validators.required],
    dateFin: [this.data.semestre?.dateFin ?? '', Validators.required],
    anneeAcademiqueId: [this.data.semestre?.anneeAcademiqueId ?? '', Validators.required],
  });

  private readonly anneeIdChoisie = toSignal(this.form.controls.anneeAcademiqueId.valueChanges, {
    initialValue: this.form.controls.anneeAcademiqueId.value,
  });

  constructor() {
    // En édition, l'ordre existant est conservé tel quel (le changer romprait son
    // appariement avec les autres années lors d'une reconduction - voir ReconductionService).
    if (this.enEdition) return;
    effect(() => {
      const anneeId = this.anneeIdChoisie();
      const ordre = this.data.semestres.filter((s) => s.anneeAcademiqueId === anneeId).length + 1;
      this.form.controls.ordre.setValue(ordre);
      // Plus saisies à la main : alignées sur la période de l'année académique choisie
      // (voir ReconductionService, qui a seulement besoin de dates non nulles à décaler).
      const annee = this.data.annees.find((a) => a.id === anneeId);
      this.form.controls.dateDebut.setValue(annee?.dateDebut ?? '');
      this.form.controls.dateFin.setValue(annee?.dateFin ?? '');
    });
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.semestre?.id;
    const appel = id ? this.academique.modifierSemestre(id, requete) : this.academique.creerSemestre(requete);
    appel.subscribe({
      next: (semestre) => {
        this.enCours.set(false);
        this.dialogRef.close(semestre);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
