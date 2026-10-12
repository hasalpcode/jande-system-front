import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ParametrageFinancierService } from '../../core/services/parametrage-financier.service';
import { PaiementsService } from '../../core/services/paiements.service';
import { ModePaiement, TYPES_ENGAGEMENT_PIVOT } from '../../core/models/parametrage.models';
import { CalendrierInscription, InscriptionValidee, Paiement, Pointage } from '../../core/models/paiements.models';
import { ApiErrorResponse } from '../../core/models/error.models';
import { PaiementFormDialog, PaiementFormDialogData } from './paiement-form-dialog/paiement-form-dialog';

/** Index 0 = Janvier, ... 11 = Decembre - meme convention que le calendrier d'inscription. */
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

@Component({
  selector: 'app-paiements',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './paiements.html',
  styleUrl: './paiements.scss',
})
export class PaiementsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly paiementsService = inject(PaiementsService);
  private readonly financier = inject(ParametrageFinancierService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly typesEngagementPivot = TYPES_ENGAGEMENT_PIVOT;

  readonly inscriptionsValidees = signal<InscriptionValidee[]>([]);
  readonly rechercheEtudiant = signal('');
  readonly inscriptionsFiltrees = computed(() => {
    const q = this.rechercheEtudiant().trim().toLowerCase();
    if (!q) return this.inscriptionsValidees();
    return this.inscriptionsValidees().filter(
      (i) => i.matricule.toLowerCase().includes(q) || i.nom.toLowerCase().includes(q) || i.prenom.toLowerCase().includes(q),
    );
  });

  readonly taillePage = 10;
  readonly pageIndex = signal(0);
  readonly inscriptionsPagees = computed(() => {
    const debut = this.pageIndex() * this.taillePage;
    return this.inscriptionsFiltrees().slice(debut, debut + this.taillePage);
  });
  readonly modesPaiement = signal<ModePaiement[]>([]);
  readonly pointages = signal<Pointage[]>([]);
  readonly chargement = signal(true);

  /** null = vue liste des inscriptions validees ; sinon "Details paiement" de l'inscription choisie. */
  readonly calendrier = signal<CalendrierInscription | null>(null);
  readonly chargementCalendrier = signal(false);
  readonly erreurPointage = signal<string | null>(null);

  readonly resteAPayer = computed(() => {
    const c = this.calendrier();
    return c ? c.totalPrevu - c.totalPaye : 0;
  });

  readonly formPointage = this.fb.nonNullable.group({
    numeroCarte: ['', Validators.required],
    poste: [''],
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    forkJoin({
      inscriptionsValidees: this.paiementsService.listerInscriptionsValidees(),
      pointages: this.paiementsService.listerPointages(),
      modes: this.financier.listerModesPaiement(),
    }).subscribe({
      next: (r) => {
        this.inscriptionsValidees.set(r.inscriptionsValidees);
        this.pointages.set(r.pointages);
        this.modesPaiement.set(r.modes);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  onRechercheChange(event: Event): void {
    this.rechercheEtudiant.set((event.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
  }

  libelleMois(dateEcheance: string): string {
    return MOIS[new Date(dateEcheance).getUTCMonth()];
  }

  libelleType(type: string): string {
    return this.typesEngagementPivot.find((t) => t.type === type)?.label ?? type;
  }

  ouvrirDetail(inscriptionId: string): void {
    this.chargementCalendrier.set(true);
    this.paiementsService.calendrier(inscriptionId).subscribe({
      next: (c) => {
        this.calendrier.set(c);
        this.chargementCalendrier.set(false);
      },
      error: () => this.chargementCalendrier.set(false),
    });
  }

  retour(): void {
    this.calendrier.set(null);
  }

  ouvrirAjoutPaiement(): void {
    const calendrier = this.calendrier();
    if (!calendrier) return;
    const ref = this.dialog.open<PaiementFormDialog, PaiementFormDialogData, Paiement>(PaiementFormDialog, {
      width: '620px',
      maxWidth: '95vw',
      data: { calendrier, modesPaiement: this.modesPaiement() },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open('Paiement enregistré, reçu émis', 'OK', { duration: 3000 });
      this.ouvrirDetail(calendrier.inscriptionId);
    });
  }

  imprimerRecu(paiementId: string): void {
    this.paiementsService.telechargerRecuPdf(paiementId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.snackBar.open('Impossible de générer le reçu', 'OK', { duration: 3000 }),
    });
  }

  soumettrePointage(): void {
    if (this.formPointage.invalid) return this.formPointage.markAllAsTouched();
    this.erreurPointage.set(null);
    this.paiementsService.pointer(this.formPointage.getRawValue()).subscribe({
      next: () => {
        this.formPointage.reset();
        this.charger();
      },
      error: (error: unknown) => {
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreurPointage.set(body?.message ?? 'Carte introuvable');
      },
    });
  }
}
