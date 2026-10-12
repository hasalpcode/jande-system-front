import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EtablissementInfoService } from '../../../core/services/etablissement-info.service';
import { EtablissementInfo } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface EtablissementFormDialogData {
  etablissement: EtablissementInfo;
}

/** Au-delà, le data URI base64 (stocké tel quel en base) devient déraisonnable. */
const TAILLE_LOGO_MAX_OCTETS = 500 * 1024;

@Component({
  selector: 'app-etablissement-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './etablissement-form-dialog.html',
  styleUrl: './etablissement-form-dialog.scss',
})
export class EtablissementFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly etablissementService = inject(EtablissementInfoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<EtablissementFormDialog, EtablissementInfo>);
  readonly data = inject<EtablissementFormDialogData>(MAT_DIALOG_DATA);

  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly logo = signal<string | null>(this.data.etablissement.logo);

  readonly form = this.fb.nonNullable.group({
    nom: [this.data.etablissement.nom, Validators.required],
    adresse: [this.data.etablissement.adresse ?? ''],
    telephone: [this.data.etablissement.telephone ?? ''],
  });

  selectionnerLogo(event: Event): void {
    const fichier = (event.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    if (fichier.size > TAILLE_LOGO_MAX_OCTETS) {
      this.snackBar.open('Image trop volumineuse (500 Ko max), choisissez-en une plus légère.', 'OK', { duration: 4000 });
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => this.logo.set(lecteur.result as string);
    lecteur.readAsDataURL(fichier);
  }

  retirerLogo(): void {
    this.logo.set(null);
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    this.etablissementService
      .modifier({
        nom: v.nom,
        adresse: v.adresse || undefined,
        telephone: v.telephone || undefined,
        logo: this.logo() || undefined,
      })
      .subscribe({
        next: (etablissement) => {
          this.enCours.set(false);
          this.dialogRef.close(etablissement);
        },
        error: (error: unknown) => {
          this.enCours.set(false);
          const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
          this.erreur.set(body?.message ?? "L'enregistrement a échoué, réessayez.");
        },
      });
  }
}
