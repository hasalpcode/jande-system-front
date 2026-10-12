import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { StatistiquesService } from '../../core/services/statistiques.service';
import { ParcoursService } from '../../core/services/parcours.service';
import { PaiementsService } from '../../core/services/paiements.service';
import { ParametrageAcademiqueService } from '../../core/services/parametrage-academique.service';
import { EtablissementInfoService } from '../../core/services/etablissement-info.service';
import { Classe } from '../../core/models/parcours.models';
import { AnneeAcademique, EtablissementInfo, TYPES_ENGAGEMENT_PIVOT } from '../../core/models/parametrage.models';
import { CalendrierInscription } from '../../core/models/paiements.models';
import { ImpayesMensuel, LigneBrouillard, SituationClasse, SituationMensuelleClasse } from '../../core/models/statistiques.models';

/** Index 0 = Janvier, ... 11 = Decembre - meme convention que le calendrier d'inscription. */
const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/** Options 1-12 pour le sélecteur "Mois" (toujours tous les mois, quelle que soit la classe). */
const OPTIONS_MOIS = MOIS.map((libelle, i) => ({ valeur: i + 1, libelle }));

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DecimalPipe,
  ],
  templateUrl: './statistiques.html',
  styleUrl: './statistiques.scss',
})
export class StatistiquesPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly statistiquesService = inject(StatistiquesService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly paiementsService = inject(PaiementsService);
  private readonly parametrageAcademiqueService = inject(ParametrageAcademiqueService);
  private readonly etablissementService = inject(EtablissementInfoService);
  private readonly snackBar = inject(MatSnackBar);

  readonly etablissement = signal<EtablissementInfo | null>(null);

  readonly typesEngagementPivot = TYPES_ENGAGEMENT_PIVOT;

  readonly classes = signal<Classe[]>([]);
  readonly anneesAcademiques = signal<AnneeAcademique[]>([]);
  readonly chargementReferentiels = signal(true);

  readonly formClasse = this.fb.nonNullable.group({ classeId: [''] });
  readonly formBrouillard = this.fb.nonNullable.group({ dateDebut: [''], dateFin: [''] });

  // Onglet "Situation étudiant" : parcours en 3 étapes — choix de la classe, liste
  // des étudiants de cette classe (dû/payé/solde), puis détail du plan de paiement
  // d'un étudiant choisi (calendrier des échéances, comme dans Paiements).
  readonly formClasseEtudiants = this.fb.nonNullable.group({ classeId: [''] });
  readonly classeEtudiants = signal<SituationClasse | null>(null);
  readonly chargementClasseEtudiants = signal(false);
  readonly detailEtudiant = signal<CalendrierInscription | null>(null);
  readonly chargementDetailEtudiant = signal(false);

  readonly resteAPayerEtudiant = computed(() => {
    const d = this.detailEtudiant();
    return d ? d.totalPrevu - d.totalPaye : 0;
  });

  // Onglet "Situation classe" : parcours en 3 étapes — choix de la classe, choix de
  // l'année académique + du mois, puis liste des étudiants ayant payé / pas payé ce
  // mois-là (comme sur la plateforme de référence : "Situation paiements" > "Charger
  // les paiements"). Tous les mois sont toujours proposés, indépendamment des
  // mensualités déjà enregistrées.
  readonly optionsMois = OPTIONS_MOIS;
  readonly classeMensuelleChoisie = signal<Classe | null>(null);
  readonly formMois = this.fb.nonNullable.group({ annee: [''], mois: [''] });


  readonly situationMensuelle = signal<SituationMensuelleClasse | null>(null);
  readonly chargementSituationMensuelle = signal(false);
  readonly ongletMensuel = signal<'payants' | 'nonPayants'>('payants');
  readonly rechercheMensuelle = signal('');

  readonly listeMensuelleActive = computed(() => {
    const s = this.situationMensuelle();
    if (!s) return [];
    const liste = this.ongletMensuel() === 'payants' ? s.payants : s.nonPayants;
    const q = this.rechercheMensuelle().trim().toLowerCase();
    if (!q) return liste;
    return liste.filter(
      (l) => l.matricule.toLowerCase().includes(q) || l.nom.toLowerCase().includes(q) || l.prenom.toLowerCase().includes(q),
    );
  });

  readonly detailEtudiantMensuel = signal<CalendrierInscription | null>(null);
  readonly chargementDetailMensuel = signal(false);
  readonly resteAPayerMensuel = computed(() => {
    const d = this.detailEtudiantMensuel();
    return d ? d.totalPrevu - d.totalPaye : 0;
  });

  // Onglet "Impayés" : même principe que "Situation classe" (année + mois) mais sur
  // l'ensemble de l'établissement, avec le détail prévu/payé/restant par étudiant —
  // comme sur la plateforme de référence : "Impayés" > "Situation paiements".
  readonly formImpayes = this.fb.nonNullable.group({ annee: [''], mois: [''] });
  readonly impayesMensuel = signal<ImpayesMensuel | null>(null);
  readonly chargementImpayes = signal(false);
  readonly rechercheImpayes = signal('');

  readonly lignesImpayesFiltrees = computed(() => {
    const r = this.impayesMensuel();
    if (!r) return [];
    const q = this.rechercheImpayes().trim().toLowerCase();
    if (!q) return r.lignes;
    return r.lignes.filter((l) => l.matricule.toLowerCase().includes(q) || l.nomComplet.toLowerCase().includes(q));
  });

  readonly pourcentagePayeImpayes = computed(() => {
    const r = this.impayesMensuel();
    return r && r.totalEngagement > 0 ? Math.round((r.totalPaye / r.totalEngagement) * 100) : 0;
  });

  readonly pourcentageResteImpayes = computed(() => {
    const r = this.impayesMensuel();
    return r && r.totalEngagement > 0 ? Math.round((r.resteAPayer / r.totalEngagement) * 100) : 0;
  });

  readonly brouillard = signal<LigneBrouillard[] | null>(null);
  readonly chargementBrouillard = signal(false);

  ngOnInit(): void {
    forkJoin({
      classes: this.parcoursService.listerClasses(),
      annees: this.parametrageAcademiqueService.listerAnnees(),
    }).subscribe({
      next: (r) => {
        this.classes.set(r.classes);
        this.anneesAcademiques.set(r.annees);
        const anneeActive = r.annees.find((a) => a.active);
        if (anneeActive) this.formImpayes.patchValue({ annee: anneeActive.id });
        this.chargementReferentiels.set(false);
      },
      error: () => this.chargementReferentiels.set(false),
    });
    this.etablissementService.obtenir().subscribe({
      next: (e) => this.etablissement.set(e),
      error: () => this.etablissement.set(null),
    });
    this.chargerBrouillard();
  }

  chargerEtudiantsClasse(): void {
    const id = this.formClasseEtudiants.getRawValue().classeId;
    if (!id) return;
    this.chargementClasseEtudiants.set(true);
    this.statistiquesService.situationClasse(id).subscribe({
      next: (s) => {
        this.classeEtudiants.set(s);
        this.chargementClasseEtudiants.set(false);
      },
      error: () => this.chargementClasseEtudiants.set(false),
    });
  }

  changerClasseEtudiants(): void {
    this.classeEtudiants.set(null);
    this.detailEtudiant.set(null);
    this.formClasseEtudiants.reset({ classeId: '' });
  }

  voirDetailEtudiant(inscriptionId: string): void {
    this.chargementDetailEtudiant.set(true);
    this.paiementsService.calendrier(inscriptionId).subscribe({
      next: (c) => {
        this.detailEtudiant.set(c);
        this.chargementDetailEtudiant.set(false);
      },
      error: () => this.chargementDetailEtudiant.set(false),
    });
  }

  retourListeEtudiants(): void {
    this.detailEtudiant.set(null);
  }

  imprimerRecuEtudiant(paiementId: string): void {
    this.paiementsService.telechargerRecuPdf(paiementId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.snackBar.open('Impossible de générer le reçu', 'OK', { duration: 3000 }),
    });
  }

  libelleMois(dateEcheance: string): string {
    return MOIS[new Date(dateEcheance).getUTCMonth()];
  }

  libelleType(type: string): string {
    return this.typesEngagementPivot.find((t) => t.type === type)?.label ?? type;
  }

  consulterClasse(): void {
    const id = this.formClasse.getRawValue().classeId;
    const classe = this.classes().find((c) => c.id === id);
    if (!id || !classe) return;
    this.classeMensuelleChoisie.set(classe);
    this.situationMensuelle.set(null);
    this.detailEtudiantMensuel.set(null);
    // Pré-sélectionne l'année académique de la classe elle-même quand elle existe
    // parmi les années configurées.
    const anneeParDefaut = this.anneesAcademiques().find((a) => a.id === classe.anneeAcademiqueId);
    this.formMois.reset({ annee: anneeParDefaut?.id ?? '', mois: '' });
  }

  changerClasseMensuelle(): void {
    this.classeMensuelleChoisie.set(null);
    this.situationMensuelle.set(null);
    this.detailEtudiantMensuel.set(null);
    this.formClasse.reset({ classeId: '' });
  }

  chargerPaiementsMensuels(): void {
    const classe = this.classeMensuelleChoisie();
    const { annee: anneeAcademiqueId, mois } = this.formMois.getRawValue();
    const anneeAcademique = this.anneesAcademiques().find((a) => a.id === anneeAcademiqueId);
    if (!classe || !anneeAcademique || !mois) return;
    const annee = this.anneeCalendaireDuMois(anneeAcademique, Number(mois));
    this.ongletMensuel.set('payants');
    this.rechercheMensuelle.set('');
    this.chargementSituationMensuelle.set(true);
    this.statistiquesService.situationMensuelleClasse(classe.id, annee, Number(mois)).subscribe({
      next: (s) => {
        this.situationMensuelle.set(s);
        this.chargementSituationMensuelle.set(false);
      },
      error: () => this.chargementSituationMensuelle.set(false),
    });
  }

  /**
   * Une année académique (ex. "2026-2027") s'étend sur deux années calendaires — le mois
   * choisi (1-12) détermine laquelle utiliser pour interroger le backend (annee+mois),
   * en parcourant les mois de l'année académique depuis sa date de début.
   */
  private anneeCalendaireDuMois(anneeAcademique: AnneeAcademique, mois: number): number {
    const debut = new Date(anneeAcademique.dateDebut);
    const fin = new Date(anneeAcademique.dateFin);
    let annee = debut.getUTCFullYear();
    let moisCourant = debut.getUTCMonth() + 1;
    while (!(annee === fin.getUTCFullYear() && moisCourant === fin.getUTCMonth() + 1)) {
      if (moisCourant === mois) return annee;
      moisCourant++;
      if (moisCourant > 12) {
        moisCourant = 1;
        annee++;
      }
    }
    return moisCourant === mois ? annee : debut.getUTCFullYear();
  }

  retourMoisSelection(): void {
    this.situationMensuelle.set(null);
    this.detailEtudiantMensuel.set(null);
  }

  voirDetailEtudiantMensuel(inscriptionId: string): void {
    this.chargementDetailMensuel.set(true);
    this.paiementsService.calendrier(inscriptionId).subscribe({
      next: (c) => {
        this.detailEtudiantMensuel.set(c);
        this.chargementDetailMensuel.set(false);
      },
      error: () => this.chargementDetailMensuel.set(false),
    });
  }

  fermerDetailMensuel(): void {
    this.detailEtudiantMensuel.set(null);
  }

  libelleMoisAnnee(mois: number, annee: number): string {
    return `${MOIS[mois - 1]} ${annee}`;
  }

  libelleGenre(genre: string | null): string {
    return genre === 'M' ? 'Masculin' : genre === 'F' ? 'Féminin' : '—';
  }

  chargerImpayesMensuel(): void {
    const { annee: anneeAcademiqueId, mois } = this.formImpayes.getRawValue();
    const anneeAcademique = this.anneesAcademiques().find((a) => a.id === anneeAcademiqueId);
    if (!anneeAcademique || !mois) return;
    const annee = this.anneeCalendaireDuMois(anneeAcademique, Number(mois));
    this.rechercheImpayes.set('');
    this.chargementImpayes.set(true);
    this.statistiquesService.impayesMensuel(anneeAcademiqueId, annee, Number(mois)).subscribe({
      next: (r) => {
        this.impayesMensuel.set(r);
        this.chargementImpayes.set(false);
      },
      error: () => this.chargementImpayes.set(false),
    });
  }

  chargerBrouillard(): void {
    const { dateDebut, dateFin } = this.formBrouillard.getRawValue();
    this.chargementBrouillard.set(true);
    this.statistiquesService.brouillard(dateDebut || undefined, dateFin || undefined).subscribe({
      next: (r) => {
        this.brouillard.set(r);
        this.chargementBrouillard.set(false);
      },
      error: () => this.chargementBrouillard.set(false),
    });
  }

  totalBrouillard(): number {
    return (this.brouillard() ?? []).reduce((total, l) => total + Number(l.montant), 0);
  }

  // ----- Impression des résultats (brouillard, situation étudiant, situation classe, impayés) -----
  // Même principe que la carte étudiante (Inscriptions) : une page HTML autonome générée
  // côté client dans une fenêtre dédiée, avec le en-tête de l'établissement, plutôt qu'un
  // PDF côté serveur pour un simple tableau.

  private echapper(v: string | null | undefined): string {
    return (v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private formatMontant(v: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(v));
  }

  private imprimer(titre: string, sousTitre: string, tableauHtml: string): void {
    const fenetre = window.open('', '_blank', 'width=900,height=700');
    if (!fenetre) return;
    const etab = this.etablissement();
    const logo = etab?.logo ? `<img src="${this.echapper(etab.logo)}" alt="" class="logo" />` : '';
    const dateImpression = new Date().toLocaleString('fr-FR');

    fenetre.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>${this.echapper(titre)}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1d2129; }
        .entete { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #1a237e; padding-bottom: 10px; margin-bottom: 16px; }
        .entete .logo { height: 14mm; max-width: 24mm; object-fit: contain; }
        .entete .nom-etab { font-size: 13pt; font-weight: bold; color: #1a237e; text-transform: uppercase; }
        .entete .adresse { font-size: 8pt; color: #565f6b; }
        h1 { font-size: 14pt; margin: 0 0 2px; }
        .sous-titre { font-size: 9.5pt; color: #565f6b; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        th, td { border: 1px solid #c8ccd2; padding: 4px 7px; text-align: left; }
        th { background: #eef0f3; }
        td.numeric, th.numeric { text-align: right; }
        tfoot td { font-weight: bold; background: #f2f4f8; }
        .date-impression { margin-top: 18px; font-size: 7.5pt; color: #94999f; text-align: right; }
      </style>
    </head><body>
      <div class="entete">
        ${logo}
        <div>
          <div class="nom-etab">${this.echapper(etab?.nom || 'Établissement')}</div>
          <div class="adresse">${this.echapper(etab?.adresse)}</div>
        </div>
      </div>
      <h1>${this.echapper(titre)}</h1>
      <p class="sous-titre">${this.echapper(sousTitre)}</p>
      ${tableauHtml}
      <p class="date-impression">Imprimé le ${dateImpression}</p>
      <script>window.onload = () => window.print();<\/script>
    </body></html>`);
    fenetre.document.close();
  }

  imprimerBrouillard(): void {
    const lignes = this.brouillard() ?? [];
    const { dateDebut, dateFin } = this.formBrouillard.getRawValue();
    const sousTitre = `Période : ${dateDebut || 'début'} → ${dateFin || "aujourd'hui"}`;
    const corps = lignes
      .map(
        (l) => `<tr>
          <td>${this.echapper(l.datePaiement)}</td>
          <td>${this.echapper(l.etudiantNomComplet)} (${this.echapper(l.matricule)})</td>
          <td>${this.echapper(l.engagementLibelle)}</td>
          <td>${this.echapper(l.modePaiementLibelle)}</td>
          <td>${this.echapper(l.numeroRecu)}</td>
          <td class="numeric">${this.formatMontant(l.montant)}</td>
        </tr>`,
      )
      .join('');
    const tableau = `<table>
      <thead><tr><th>Date</th><th>Étudiant</th><th>Engagement</th><th>Mode</th><th>Reçu</th><th class="numeric">Montant</th></tr></thead>
      <tbody>${corps || '<tr><td colspan="6">Aucun paiement sur cette période.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="5">Total</td><td class="numeric">${this.formatMontant(this.totalBrouillard())}</td></tr></tfoot>
    </table>`;
    this.imprimer('Brouillard des paiements', sousTitre, tableau);
  }

  imprimerSituationEtudiant(): void {
    const s = this.classeEtudiants();
    if (!s) return;
    const corps = s.etudiants
      .map(
        (l) => `<tr>
          <td>${this.echapper(l.nomComplet)} (${this.echapper(l.matricule)})</td>
          <td class="numeric">${this.formatMontant(l.totalDu)}</td>
          <td class="numeric">${this.formatMontant(l.totalPaye)}</td>
          <td class="numeric">${this.formatMontant(l.solde)}</td>
        </tr>`,
      )
      .join('');
    const tableau = `<table>
      <thead><tr><th>Étudiant</th><th class="numeric">Dû</th><th class="numeric">Payé</th><th class="numeric">Solde</th></tr></thead>
      <tbody>${corps || '<tr><td colspan="4">Aucun étudiant inscrit dans cette classe.</td></tr>'}</tbody>
      <tfoot><tr>
        <td>Total</td>
        <td class="numeric">${this.formatMontant(s.totalDuClasse)}</td>
        <td class="numeric">${this.formatMontant(s.totalPayeClasse)}</td>
        <td class="numeric">${this.formatMontant(s.soldeClasse)}</td>
      </tr></tfoot>
    </table>`;
    this.imprimer('Situation de paiement par étudiant', `Classe : ${s.classeLibelle}`, tableau);
  }

  imprimerSituationClasse(): void {
    const s = this.situationMensuelle();
    if (!s) return;
    const liste = this.listeMensuelleActive();
    const corps = liste
      .map(
        (l) => `<tr>
          <td>${this.echapper(l.matricule)}</td>
          <td>${this.echapper(l.nom)}</td>
          <td>${this.echapper(l.prenom)}</td>
          <td>${this.echapper(l.telephone)}</td>
          <td>${this.echapper(l.dateNaissance)}</td>
          <td>${this.echapper(l.lieuNaissance)}</td>
          <td>${this.echapper(this.libelleGenre(l.genre))}</td>
        </tr>`,
      )
      .join('');
    const tableau = `<table>
      <thead><tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Téléphone</th><th>Date naissance</th><th>Lieu de naissance</th><th>Genre</th></tr></thead>
      <tbody>${corps || '<tr><td colspan="7">Aucun étudiant dans cette liste.</td></tr>'}</tbody>
    </table>`;
    const statutLibelle = this.ongletMensuel() === 'payants' ? 'Payants' : 'Non payants';
    this.imprimer(
      'Situation de paiement par classe',
      `Classe : ${s.classeLibelle} — Mois : ${this.libelleMoisAnnee(s.mois, s.annee)} — ${statutLibelle} (${liste.length})`,
      tableau,
    );
  }

  imprimerImpayes(): void {
    const r = this.impayesMensuel();
    if (!r) return;
    const lignes = this.lignesImpayesFiltrees();
    const corps = lignes
      .map(
        (l) => `<tr>
          <td>${this.echapper(l.matricule)}</td>
          <td>${this.echapper(l.nomComplet)}</td>
          <td class="numeric">${this.formatMontant(l.montantPrevu)}</td>
          <td class="numeric">${this.formatMontant(l.montantPaye)}</td>
          <td class="numeric">${this.formatMontant(l.montantRestant)}</td>
        </tr>`,
      )
      .join('');
    const tableau = `<table>
      <thead><tr><th>Matricule</th><th>Étudiant</th><th class="numeric">Montant prévu</th><th class="numeric">Montant payé</th><th class="numeric">Montant restant</th></tr></thead>
      <tbody>${corps || '<tr><td colspan="5">Aucun étudiant.</td></tr>'}</tbody>
      <tfoot><tr>
        <td colspan="2">Total</td>
        <td class="numeric">${this.formatMontant(r.totalEngagement)}</td>
        <td class="numeric">${this.formatMontant(r.totalPaye)}</td>
        <td class="numeric">${this.formatMontant(r.resteAPayer)}</td>
      </tr></tfoot>
    </table>`;
    this.imprimer('Impayés', `Mois : ${this.libelleMoisAnnee(r.mois, r.annee)}`, tableau);
  }
}
