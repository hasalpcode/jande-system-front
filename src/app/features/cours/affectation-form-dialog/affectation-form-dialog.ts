import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CoursService } from '../../../core/services/cours.service';
import { Affectation, AffectationRequest, Professeur } from '../../../core/models/cours.models';
import { Classe, ElementConstitutif } from '../../../core/models/parcours.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface AffectationFormDialogData {
  classe: Classe;
  elementsConstitutifs: ElementConstitutif[];
  professeurs: Professeur[];
  /** Présent = modification ; absent = ajout. */
  affectation?: Affectation;
}

@Component({
  selector: 'app-affectation-form-dialog',
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
  templateUrl: './affectation-form-dialog.html',
  styleUrl: './affectation-form-dialog.scss',
})
export class AffectationFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly coursService = inject(CoursService);
  private readonly dialogRef = inject(MatDialogRef<AffectationFormDialog, Affectation>);
  readonly data = inject<AffectationFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.affectation;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    elementConstitutifId: [this.data.affectation?.elementConstitutif?.id ?? '', Validators.required],
    volumeHorairePrevu: [this.data.affectation?.volumeHorairePrevu ?? 20, Validators.required],
    professeurId: [this.data.affectation?.professeur?.id ?? '', Validators.required],
  });

  private readonly elementConstitutifIdChoisi = toSignal(this.form.controls.elementConstitutifId.valueChanges, {
    initialValue: this.form.controls.elementConstitutifId.value,
  });
  /** Affiché à titre indicatif : les crédits de l'élément constitutif choisi. */
  readonly creditsChoisis = computed(
    () => this.data.elementsConstitutifs.find((e) => e.id === this.elementConstitutifIdChoisi())?.credits ?? null,
  );

  constructor() {
    // Le volume horaire prevu d'une affectation doit toujours correspondre au volume
    // horaire global de l'EC choisi - champ desactive plutot que librement saisi.
    this.form.controls.volumeHorairePrevu.disable();
    effect(() => {
      const ec = this.data.elementsConstitutifs.find((e) => e.id === this.elementConstitutifIdChoisi());
      if (ec?.volumeHoraireGlobal != null) {
        this.form.controls.volumeHorairePrevu.setValue(ec.volumeHoraireGlobal);
      }
    });
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    const requete: AffectationRequest = {
      elementConstitutifId: v.elementConstitutifId,
      volumeHorairePrevu: v.volumeHorairePrevu,
      professeurId: v.professeurId,
      classeId: this.data.classe.id,
    };
    const id = this.data.affectation?.id;
    const appel = id ? this.coursService.modifierAffectation(id, requete) : this.coursService.creerAffectation(requete);
    appel.subscribe({
      next: (affectation) => {
        this.enCours.set(false);
        this.dialogRef.close(affectation);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
