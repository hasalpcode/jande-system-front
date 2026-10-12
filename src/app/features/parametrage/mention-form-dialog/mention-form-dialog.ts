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
import { Domaine, Mention } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface MentionFormDialogData {
  domaines: Domaine[];
  /** Présent = modification ; absent = ajout. */
  mention?: Mention;
}

@Component({
  selector: 'app-mention-form-dialog',
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
  templateUrl: './mention-form-dialog.html',
  styleUrl: './mention-form-dialog.scss',
})
export class MentionFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialogRef = inject(MatDialogRef<MentionFormDialog, Mention>);
  readonly data = inject<MentionFormDialogData>(MAT_DIALOG_DATA);

  readonly enEdition = !!this.data.mention;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    code: [this.data.mention?.code ?? '', Validators.required],
    libelle: [this.data.mention?.libelle ?? '', Validators.required],
    domaineId: [this.data.mention?.domaineId ?? '', Validators.required],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const requete = this.form.getRawValue();
    const id = this.data.mention?.id;
    const appel = id ? this.academique.modifierMention(id, requete) : this.academique.creerMention(requete);
    appel.subscribe({
      next: (mention) => {
        this.enCours.set(false);
        this.dialogRef.close(mention);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
      },
    });
  }
}
