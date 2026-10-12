import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParcoursService } from '../../../core/services/parcours.service';
import { ElementConstitutif, UniteEnseignement } from '../../../core/models/parcours.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface ElementConstitutifFormDialogData {
  uniteEnseignement: UniteEnseignement;
}

@Component({
  selector: 'app-element-constitutif-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './element-constitutif-form-dialog.html',
  styleUrl: './element-constitutif-form-dialog.scss',
})
export class ElementConstitutifFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly parcoursService = inject(ParcoursService);
  private readonly dialogRef = inject(MatDialogRef<ElementConstitutifFormDialog, ElementConstitutif>);
  readonly data = inject<ElementConstitutifFormDialogData>(MAT_DIALOG_DATA);

  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    intitule: ['', Validators.required],
    volumeHoraireCm: [0, Validators.required],
    volumeHoraireTdTp: [0, Validators.required],
    volumeHoraireTpe: [0, Validators.required],
    coefficient: [0, Validators.required],
  });

  private readonly volumeHoraireCm = toSignal(this.form.controls.volumeHoraireCm.valueChanges, {
    initialValue: this.form.controls.volumeHoraireCm.value,
  });
  private readonly volumeHoraireTdTp = toSignal(this.form.controls.volumeHoraireTdTp.valueChanges, {
    initialValue: this.form.controls.volumeHoraireTdTp.value,
  });
  private readonly volumeHoraireTpe = toSignal(this.form.controls.volumeHoraireTpe.valueChanges, {
    initialValue: this.form.controls.volumeHoraireTpe.value,
  });

  /** Aperçu du crédit auto-calculé (20h de volume horaire global = 1 crédit) -
   * la valeur réelle est recalculée côté serveur, voir ElementConstitutif. */
  readonly creditsApercu = computed(() =>
    Math.round((this.volumeHoraireCm() + this.volumeHoraireTdTp() + this.volumeHoraireTpe()) / 20),
  );

  /** Le coefficient est initialisé au crédit par défaut, et continue à le suivre tant que
   * l'admin n'y a pas touché manuellement (voir surCoefficientSaisiManuellement). */
  private readonly coefficientModifieManuellement = signal(false);

  constructor() {
    effect(() => {
      if (this.coefficientModifieManuellement()) return;
      this.form.controls.coefficient.setValue(this.creditsApercu(), { emitEvent: false });
    });
  }

  surCoefficientSaisiManuellement(): void {
    this.coefficientModifieManuellement.set(true);
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    this.parcoursService
      .creerElementConstitutif({ ...this.form.getRawValue(), uniteEnseignementId: this.data.uniteEnseignement.id })
      .subscribe({
        next: (ec) => {
          this.enCours.set(false);
          this.dialogRef.close(ec);
        },
        error: (error: unknown) => {
          this.enCours.set(false);
          const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
          this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
        },
      });
  }
}
