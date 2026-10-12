import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { RhService } from '../../core/services/rh.service';
import { CoursService } from '../../core/services/cours.service';
import { Badgeage, BudgetDepense, ContratVacataire, Depense, TYPES_BADGEAGE } from '../../core/models/rh.models';
import { Professeur } from '../../core/models/cours.models';
import { lireFichierEnDataUri, ouvrirDataUri } from '../../core/utils/data-uri';

@Component({
  selector: 'app-rh',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './rh.html',
  styleUrl: './rh.scss',
})
export class RhPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rhService = inject(RhService);
  private readonly coursService = inject(CoursService);
  private readonly snackBar = inject(MatSnackBar);

  readonly typesBadgeage = TYPES_BADGEAGE;

  readonly depenses = signal<Depense[]>([]);
  readonly budget = signal<BudgetDepense | null>(null);
  readonly badgeages = signal<Badgeage[]>([]);
  readonly contrats = signal<ContratVacataire[]>([]);
  readonly professeurs = signal<Professeur[]>([]);
  readonly chargement = signal(true);

  readonly panneauDepense = signal(false);
  readonly panneauBudget = signal(false);
  readonly panneauBadgeage = signal(false);
  readonly panneauContrat = signal(false);

  readonly budgetOuvert = signal(true);
  readonly depensesOuvert = signal(true);

  readonly formDepense = this.fb.nonNullable.group({
    categorie: ['', Validators.required],
    montant: [0, Validators.required],
    justificatif: [''],
    pieceJointe: this.fb.control<string | null>(null),
  });

  readonly formBudget = this.fb.nonNullable.group({
    montant: [0, Validators.required],
    date: [''],
  });

  readonly formBadgeage = this.fb.nonNullable.group({
    professeurId: ['', Validators.required],
    type: this.fb.nonNullable.control(TYPES_BADGEAGE[0], Validators.required),
  });

  readonly formContrat = this.fb.nonNullable.group({
    professeurId: ['', Validators.required],
    tauxHoraire: [0, Validators.required],
    dateDebut: ['', Validators.required],
    dateFin: [''],
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    forkJoin({
      depenses: this.rhService.listerDepenses(),
      budget: this.rhService.obtenirBudgetDepenses(),
      badgeages: this.rhService.listerBadgeages(),
      contrats: this.rhService.listerContrats(),
      professeurs: this.coursService.listerProfesseurs(),
    }).subscribe({
      next: (r) => {
        this.depenses.set(r.depenses);
        this.budget.set(r.budget);
        this.badgeages.set(r.badgeages);
        this.contrats.set(r.contrats);
        this.professeurs.set(r.professeurs);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  soumettreDepense(): void {
    if (this.formDepense.invalid) return this.formDepense.markAllAsTouched();
    const v = this.formDepense.getRawValue();
    this.rhService.creerDepense({ ...v, pieceJointe: v.pieceJointe ?? undefined }).subscribe(() => {
      this.formDepense.reset({ montant: 0, pieceJointe: null });
      this.panneauDepense.set(false);
      this.charger();
    });
  }

  /** Photo ou PDF du justificatif - mêmes contraintes (2 Mo max) que la pièce jointe d'une
   * absence en Cours, voir core/utils/data-uri. */
  selectionnerPieceDepense(event: Event): void {
    const fichier = (event.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    lireFichierEnDataUri(
      fichier,
      (dataUri) => this.formDepense.controls.pieceJointe.setValue(dataUri),
      () => this.snackBar.open('Fichier trop volumineux (2 Mo max), choisissez-en un plus léger.', 'OK', { duration: 4000 }),
    );
  }

  retirerPieceDepense(): void {
    this.formDepense.controls.pieceJointe.setValue(null);
  }

  voirPieceDepense(depense: Depense): void {
    if (depense.pieceJointe) ouvrirDataUri(depense.pieceJointe);
  }

  ouvrirBudget(): void {
    this.formBudget.reset({ montant: 0, date: '' });
    this.panneauBudget.set(true);
  }

  soumettreBudget(): void {
    if (this.formBudget.invalid) return this.formBudget.markAllAsTouched();
    const v = this.formBudget.getRawValue();
    this.rhService.ajouterDepotBudget({ montant: v.montant, date: v.date || undefined }).subscribe((budget) => {
      this.budget.set(budget);
      this.panneauBudget.set(false);
    });
  }

  soumettreBadgeage(): void {
    if (this.formBadgeage.invalid) return this.formBadgeage.markAllAsTouched();
    this.rhService.pointer(this.formBadgeage.getRawValue()).subscribe(() => {
      this.formBadgeage.reset({ type: TYPES_BADGEAGE[0] });
      this.panneauBadgeage.set(false);
      this.charger();
    });
  }

  soumettreContrat(): void {
    if (this.formContrat.invalid) return this.formContrat.markAllAsTouched();
    const v = this.formContrat.getRawValue();
    this.rhService.creerContrat({ ...v, dateFin: v.dateFin || undefined }).subscribe(() => {
      this.formContrat.reset({ tauxHoraire: 0 });
      this.panneauContrat.set(false);
      this.charger();
    });
  }
}
