import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametrageAcademiqueService } from '../../../core/services/parametrage-academique.service';
import { Mention, Option } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface OptionFormDialogData {
  mentions: Mention[];
  /** Présent = modification ; absent = ajout. */
  option?: Option;
}

@Component({
  selector: 'app-option-form-dialog',
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
  templateUrl: './option-form-dialog.html',
  styleUrl: './option-form-dialog.scss',
})
export class OptionFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<OptionFormDialog, Option>);
  readonly data = inject<OptionFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.option;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: [this.data.option?.code ?? '', Validators.required],
    libelle: [this.data.option?.libelle ?? '', Validators.required],
    mentionId: [this.data.option?.mentionId ?? '', Validators.required],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.option?.id;
    const appel = id ? this.academique.modifierOption(id, requete) : this.academique.creerOption(requete);
    appel.subscribe({
      next: (option) => {
        this.enCours.set(false);
        this.dialogRef.close(option);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
