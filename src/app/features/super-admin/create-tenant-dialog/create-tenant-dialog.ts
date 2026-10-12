import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EtablissementService } from '../../../core/services/etablissement.service';
import { Etablissement, TypeEtablissement } from '../../../core/models/etablissement.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

@Component({
  selector: 'app-create-tenant-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './create-tenant-dialog.html',
  styleUrl: './create-tenant-dialog.scss',
})
export class CreateTenantDialog {
  private readonly fb = inject(FormBuilder);
  private readonly etablissementService = inject(EtablissementService);
  private readonly dialogRef = inject(MatDialogRef<CreateTenantDialog>);

  readonly types: TypeEtablissement[] = ['SCOLAIRE', 'LMD', 'MIXTE'];
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nom: ['', Validators.required],
    type: this.fb.nonNullable.control<TypeEtablissement>('LMD', Validators.required),
    adresse: [''],
    adminNom: ['', Validators.required],
    adminPrenom: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
  });

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enCours.set(true);
    this.erreur.set(null);

    this.etablissementService.creer(this.form.getRawValue()).subscribe({
      next: (etablissement: Etablissement) => {
        this.enCours.set(false);
        this.dialogRef.close(etablissement);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        this.erreur.set(this.messageErreur(error));
      },
    });
  }

  private messageErreur(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | undefined;
      if (body?.message) {
        return body.message;
      }
    }
    return "La création a échoué, réessayez.";
  }
}
