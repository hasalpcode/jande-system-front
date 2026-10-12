import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Niveau } from '../../../core/models/parametrage.models';

export interface ChoisirNiveauDialogData {
  niveaux: Niveau[];
}

@Component({
  selector: 'app-choisir-niveau-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  templateUrl: './choisir-niveau-dialog.html',
})
export class ChoisirNiveauDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ChoisirNiveauDialog, string>);
  readonly data = inject<ChoisirNiveauDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    niveauId: ['', Validators.required],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  continuer(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.dialogRef.close(this.form.getRawValue().niveauId);
  }
}
