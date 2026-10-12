import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaiementsService } from '../../../core/services/paiements.service';
import { CalendrierInscription, Paiement } from '../../../core/models/paiements.models';
import { ModePaiement, TYPES_ENGAGEMENT_PIVOT } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

/** Index 0 = Janvier, ... 11 = Decembre - meme convention que le calendrier d'inscription. */
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export interface PaiementFormDialogData {
  calendrier: CalendrierInscription;
  modesPaiement: ModePaiement[];
}

@Component({
  selector: 'app-paiement-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    DecimalPipe,
  ],
  templateUrl: './paiement-form-dialog.html',
  styleUrl: './paiement-form-dialog.scss',
})
export class PaiementFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly paiementsService = inject(PaiementsService);
  private readonly dialogRef = inject(MatDialogRef<PaiementFormDialog, Paiement>);
  readonly data = inject<PaiementFormDialogData>(MAT_DIALOG_DATA);

  readonly typesEngagementPivot = TYPES_ENGAGEMENT_PIVOT;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  // Reste a payer de l'echeance choisie - plafond du champ Montant (paiement partiel autorise,
  // mais jamais au-dela de l'engagement prevu ; le backend revalide la meme regle).
  readonly resteAPayer = signal(0);

  readonly form = this.fb.nonNullable.group({
    echeancePrevueId: ['', Validators.required],
    modePaiementId: ['', Validators.required],
    montant: [0, [Validators.required, Validators.min(0.01)]],
    reference: [''],
  });

  constructor() {
    this.form.controls.echeancePrevueId.valueChanges.subscribe((echeanceId) => {
      const ligne = this.data.calendrier.echeances.find((e) => e.echeancePrevueId === echeanceId);
      const reste = ligne ? ligne.montantPrevu - ligne.montantPaye : 0;
      this.resteAPayer.set(reste);
      this.form.controls.montant.setValue(reste);
      this.form.controls.montant.setValidators([Validators.required, Validators.min(0.01), Validators.max(reste)]);
      this.form.controls.montant.updateValueAndValidity();
    });
  }

  libelleMois(dateEcheance: string): string {
    return MOIS[new Date(dateEcheance).getUTCMonth()];
  }

  libelleType(type: string): string {
    return this.typesEngagementPivot.find((t) => t.type === type)?.label ?? type;
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    this.paiementsService.enregistrer(this.form.getRawValue()).subscribe({
      next: (paiement) => {
        this.enCours.set(false);
        this.dialogRef.close(paiement);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? "L'enregistrement du paiement a échoué.");
      },
    });
  }
}
