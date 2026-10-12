import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { creerPagination } from '../../core/utils/pagination';
import { ParametrageAcademiqueService } from '../../core/services/parametrage-academique.service';
import { ParametrageFinancierService } from '../../core/services/parametrage-financier.service';
import { EtablissementInfoService } from '../../core/services/etablissement-info.service';
import { NationaliteService } from '../../core/services/nationalite.service';
import {
  AnneeAcademique,
  Domaine,
  Engagement,
  EtablissementInfo,
  FiliereAcademique,
  Mention,
  ModePaiement,
  Nationalite,
  Niveau,
  Option,
  Partenaire,
  Salle,
  Semestre,
  TYPES_ENGAGEMENT_PIVOT,
  TypeEngagement,
} from '../../core/models/parametrage.models';
import { EtablissementFormDialog, EtablissementFormDialogData } from './etablissement-form-dialog/etablissement-form-dialog';
import { AnneeFormDialog, AnneeFormDialogData } from './annee-form-dialog/annee-form-dialog';
import { SemestreFormDialog, SemestreFormDialogData } from './semestre-form-dialog/semestre-form-dialog';
import { DomaineFormDialog, DomaineFormDialogData } from './domaine-form-dialog/domaine-form-dialog';
import { MentionFormDialog, MentionFormDialogData } from './mention-form-dialog/mention-form-dialog';
import { OptionFormDialog, OptionFormDialogData } from './option-form-dialog/option-form-dialog';
import { FiliereFormDialog, FiliereFormDialogData } from './filiere-form-dialog/filiere-form-dialog';
import { SalleFormDialog, SalleFormDialogData } from './salle-form-dialog/salle-form-dialog';
import { NiveauFormDialog, NiveauFormDialogData } from './niveau-form-dialog/niveau-form-dialog';
import { NationaliteFormDialog, NationaliteFormDialogData } from './nationalite-form-dialog/nationalite-form-dialog';
import { ModePaiementFormDialog, ModePaiementFormDialogData } from './mode-paiement-form-dialog/mode-paiement-form-dialog';
import { PartenaireFormDialog, PartenaireFormDialogData } from './partenaire-form-dialog/partenaire-form-dialog';
import { EngagementPivotFormDialog, EngagementPivotFormDialogData } from './engagement-pivot-form-dialog/engagement-pivot-form-dialog';
import { ReconductionDialog, ReconductionDialogData } from './reconduction-dialog/reconduction-dialog';

@Component({
  selector: 'app-parametrage',
  standalone: true,
  imports: [
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatPaginatorModule,
    DecimalPipe,
  ],
  templateUrl: './parametrage.html',
  styleUrl: './parametrage.scss',
})
export class ParametragePage implements OnInit {
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly financier = inject(ParametrageFinancierService);
  private readonly etablissementService = inject(EtablissementInfoService);
  private readonly nationaliteService = inject(NationaliteService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly typesEngagementPivot = TYPES_ENGAGEMENT_PIVOT;

  readonly etablissement = signal<EtablissementInfo | null>(null);
  readonly annees = signal<AnneeAcademique[]>([]);
  readonly semestres = signal<Semestre[]>([]);
  readonly domaines = signal<Domaine[]>([]);
  readonly mentions = signal<Mention[]>([]);
  readonly options = signal<Option[]>([]);
  readonly filieres = signal<FiliereAcademique[]>([]);
  readonly salles = signal<Salle[]>([]);
  readonly niveaux = signal<Niveau[]>([]);
  readonly nationalites = signal<Nationalite[]>([]);
  readonly engagements = signal<Engagement[]>([]);
  readonly modesPaiement = signal<ModePaiement[]>([]);
  readonly partenaires = signal<Partenaire[]>([]);
  readonly chargement = signal(true);

  // ----- Engagements (frais) : tableau pivoté par niveau, voir plus bas -----
  readonly anneeSelectionneeId = signal<string | null>(null);

  readonly niveauxTries = computed(() => [...this.niveaux()].sort((a, b) => a.ordre - b.ordre));

  // ----- Pagination (5 par page) des tableaux de paramétrage -----
  readonly paginationAnnees = creerPagination(() => this.annees());
  readonly paginationSemestres = creerPagination(() => this.semestres());
  readonly paginationDomaines = creerPagination(() => this.domaines());
  readonly paginationMentions = creerPagination(() => this.mentions());
  readonly paginationOptions = creerPagination(() => this.options());
  readonly paginationFilieres = creerPagination(() => this.filieres());
  readonly paginationSalles = creerPagination(() => this.salles());
  readonly paginationNiveaux = creerPagination(() => this.niveauxTries());
  readonly paginationNationalites = creerPagination(() => this.nationalites());
  readonly paginationEngagementsNiveaux = creerPagination(() => this.niveauxTries());
  readonly paginationModesPaiement = creerPagination(() => this.modesPaiement());
  readonly paginationPartenaires = creerPagination(() => this.partenaires());

  anneeLibelle(anneeAcademiqueId: string | null): string {
    return this.annees().find((a) => a.id === anneeAcademiqueId)?.libelle ?? '—';
  }

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    forkJoin({
      etablissement: this.etablissementService.obtenir(),
      annees: this.academique.listerAnnees(),
      semestres: this.academique.listerSemestres(),
      domaines: this.academique.listerDomaines(),
      mentions: this.academique.listerMentions(),
      options: this.academique.listerOptions(),
      filieres: this.academique.listerFilieres(),
      salles: this.academique.listerSalles(),
      niveaux: this.academique.listerNiveaux(),
      nationalites: this.nationaliteService.listerPourAdmin(),
      engagements: this.financier.listerEngagements(),
      modes: this.financier.listerModesPaiement(),
      partenaires: this.financier.listerPartenaires(),
    }).subscribe({
      next: (r) => {
        this.etablissement.set(r.etablissement);
        this.annees.set(r.annees);
        this.semestres.set(r.semestres);
        this.domaines.set(r.domaines);
        this.mentions.set(r.mentions);
        this.options.set(r.options);
        this.filieres.set(r.filieres);
        this.salles.set(r.salles);
        this.niveaux.set(r.niveaux);
        this.nationalites.set(r.nationalites);
        this.engagements.set(r.engagements);
        this.modesPaiement.set(r.modes);
        this.partenaires.set(r.partenaires);
        this.chargement.set(false);
        if (!this.anneeSelectionneeId()) {
          const active = r.annees.find((a) => a.active) ?? r.annees[0];
          this.anneeSelectionneeId.set(active ? active.id : null);
        }
      },
      error: () => this.chargement.set(false),
    });
  }

  // ----- Années académiques -----

  ouvrirAjoutAnnee(): void {
    this.ouvrirFormulaireAnnee(undefined);
  }
  ouvrirEditionAnnee(annee: AnneeAcademique): void {
    this.ouvrirFormulaireAnnee(annee);
  }
  private ouvrirFormulaireAnnee(annee: AnneeAcademique | undefined): void {
    const ref = this.dialog.open<AnneeFormDialog, AnneeFormDialogData, AnneeAcademique>(AnneeFormDialog, { data: { annee } });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(annee ? 'Année modifiée' : 'Année ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerAnnee(id: string): void {
    if (!confirm('Supprimer cette année académique ?')) return;
    this.academique.supprimerAnnee(id).subscribe({
      next: () => {
        this.snackBar.open('Année supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Établissement (identité, logo, coordonnées) -----

  ouvrirEtablissement(): void {
    const etablissement = this.etablissement();
    if (!etablissement) return;
    const ref = this.dialog.open<EtablissementFormDialog, EtablissementFormDialogData, EtablissementInfo>(EtablissementFormDialog, {
      width: '560px',
      maxWidth: '95vw',
      data: { etablissement },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.etablissement.set(resultat);
      this.snackBar.open('Établissement mis à jour', 'OK', { duration: 3000 });
    });
  }

  // ----- Reconduction d'année -----

  ouvrirReconduction(): void {
    const ref = this.dialog.open<ReconductionDialog, ReconductionDialogData, boolean>(ReconductionDialog, {
      data: { annees: this.annees() },
    });
    ref.afterClosed().subscribe((succes) => {
      if (!succes) return;
      this.charger();
    });
  }

  // ----- Semestres -----

  ouvrirAjoutSemestre(): void {
    this.ouvrirFormulaireSemestre(undefined);
  }
  ouvrirEditionSemestre(semestre: Semestre): void {
    this.ouvrirFormulaireSemestre(semestre);
  }
  private ouvrirFormulaireSemestre(semestre: Semestre | undefined): void {
    const ref = this.dialog.open<SemestreFormDialog, SemestreFormDialogData, Semestre>(SemestreFormDialog, {
      data: { annees: this.annees(), semestres: this.semestres(), semestre },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(semestre ? 'Semestre modifié' : 'Semestre ajouté', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerSemestre(id: string): void {
    if (!confirm('Supprimer ce semestre ?')) return;
    this.academique.supprimerSemestre(id).subscribe({
      next: () => {
        this.snackBar.open('Semestre supprimé', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Domaines -----

  ouvrirAjoutDomaine(): void {
    this.ouvrirFormulaireDomaine(undefined);
  }
  ouvrirEditionDomaine(domaine: Domaine): void {
    this.ouvrirFormulaireDomaine(domaine);
  }
  private ouvrirFormulaireDomaine(domaine: Domaine | undefined): void {
    const ref = this.dialog.open<DomaineFormDialog, DomaineFormDialogData, Domaine>(DomaineFormDialog, { data: { domaine } });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(domaine ? 'Domaine modifié' : 'Domaine ajouté', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerDomaine(id: string): void {
    if (!confirm('Supprimer ce domaine ?')) return;
    this.academique.supprimerDomaine(id).subscribe({
      next: () => {
        this.snackBar.open('Domaine supprimé', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Mentions -----

  ouvrirAjoutMention(): void {
    this.ouvrirFormulaireMention(undefined);
  }
  ouvrirEditionMention(mention: Mention): void {
    this.ouvrirFormulaireMention(mention);
  }
  private ouvrirFormulaireMention(mention: Mention | undefined): void {
    const ref = this.dialog.open<MentionFormDialog, MentionFormDialogData, Mention>(MentionFormDialog, {
      data: { domaines: this.domaines(), mention },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(mention ? 'Mention modifiée' : 'Mention ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerMention(id: string): void {
    if (!confirm('Supprimer cette mention ?')) return;
    this.academique.supprimerMention(id).subscribe({
      next: () => {
        this.snackBar.open('Mention supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Options -----

  ouvrirAjoutOption(): void {
    this.ouvrirFormulaireOption(undefined);
  }
  ouvrirEditionOption(option: Option): void {
    this.ouvrirFormulaireOption(option);
  }
  private ouvrirFormulaireOption(option: Option | undefined): void {
    const ref = this.dialog.open<OptionFormDialog, OptionFormDialogData, Option>(OptionFormDialog, {
      data: { mentions: this.mentions(), option },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(option ? 'Option modifiée' : 'Option ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerOption(id: string): void {
    if (!confirm('Supprimer cette option ?')) return;
    this.academique.supprimerOption(id).subscribe({
      next: () => {
        this.snackBar.open('Option supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Filières -----

  ouvrirAjoutFiliere(): void {
    this.ouvrirFormulaireFiliere(undefined);
  }
  ouvrirEditionFiliere(filiere: FiliereAcademique): void {
    this.ouvrirFormulaireFiliere(filiere);
  }
  private ouvrirFormulaireFiliere(filiere: FiliereAcademique | undefined): void {
    const ref = this.dialog.open<FiliereFormDialog, FiliereFormDialogData, FiliereAcademique>(FiliereFormDialog, {
      data: { options: this.options(), filiere },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(filiere ? 'Filière modifiée' : 'Filière ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerFiliere(id: string): void {
    if (!confirm('Supprimer cette filière ?')) return;
    this.academique.supprimerFiliere(id).subscribe({
      next: () => {
        this.snackBar.open('Filière supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Salles -----

  ouvrirAjoutSalle(): void {
    this.ouvrirFormulaireSalle(undefined);
  }
  ouvrirEditionSalle(salle: Salle): void {
    this.ouvrirFormulaireSalle(salle);
  }
  private ouvrirFormulaireSalle(salle: Salle | undefined): void {
    const ref = this.dialog.open<SalleFormDialog, SalleFormDialogData, Salle>(SalleFormDialog, { data: { salle } });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(salle ? 'Salle modifiée' : 'Salle ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerSalle(id: string): void {
    if (!confirm('Supprimer cette salle ?')) return;
    this.academique.supprimerSalle(id).subscribe({
      next: () => {
        this.snackBar.open('Salle supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Niveaux -----

  ouvrirAjoutNiveau(): void {
    this.ouvrirFormulaireNiveau(undefined);
  }
  ouvrirEditionNiveau(niveau: Niveau): void {
    this.ouvrirFormulaireNiveau(niveau);
  }
  private ouvrirFormulaireNiveau(niveau: Niveau | undefined): void {
    const ref = this.dialog.open<NiveauFormDialog, NiveauFormDialogData, Niveau>(NiveauFormDialog, {
      data: { niveaux: this.niveaux(), niveau },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(niveau ? 'Niveau modifié' : 'Niveau ajouté', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerNiveau(id: string): void {
    if (!confirm('Supprimer ce niveau ?')) return;
    this.academique.supprimerNiveau(id).subscribe({
      next: () => {
        this.snackBar.open('Niveau supprimé', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () =>
        this.snackBar.open('Suppression impossible : des classes ou frais sont liés à ce niveau.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Nationalités -----

  ouvrirAjoutNationalite(): void {
    this.ouvrirFormulaireNationalite(undefined);
  }
  ouvrirEditionNationalite(nationalite: Nationalite): void {
    this.ouvrirFormulaireNationalite(nationalite);
  }
  private ouvrirFormulaireNationalite(nationalite: Nationalite | undefined): void {
    const ref = this.dialog.open<NationaliteFormDialog, NationaliteFormDialogData, Nationalite>(NationaliteFormDialog, {
      data: { nationalite },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(nationalite ? 'Nationalité modifiée' : 'Nationalité ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerNationalite(id: string): void {
    if (!confirm('Supprimer cette nationalité ?')) return;
    this.nationaliteService.supprimer(id).subscribe({
      next: () => {
        this.snackBar.open('Nationalité supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () =>
        this.snackBar.open('Suppression impossible : des étudiants sont rattachés à cette nationalité.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Engagements (frais) : tableau pivoté par niveau -----

  montantPour(niveauId: string, type: TypeEngagement): number {
    const anneeId = this.anneeSelectionneeId();
    return (
      this.engagements().find((e) => e.niveauId === niveauId && e.anneeAcademiqueId === anneeId && e.type === type)
        ?.montant ?? 0
    );
  }

  ouvrirAjoutEngagement(): void {
    this.ouvrirFormulaireEngagement(undefined);
  }
  editerEngagementsNiveau(niveauId: string): void {
    const niveau = this.niveaux().find((n) => n.id === niveauId);
    if (niveau) this.ouvrirFormulaireEngagement(niveau);
  }
  private ouvrirFormulaireEngagement(niveauCible: Niveau | undefined): void {
    const anneeId = this.anneeSelectionneeId();
    if (!anneeId) return;
    const ref = this.dialog.open<EngagementPivotFormDialog, EngagementPivotFormDialogData, boolean>(EngagementPivotFormDialog, {
      width: '760px',
      maxWidth: '95vw',
      data: { anneeId, niveaux: this.niveaux(), engagements: this.engagements(), niveauCible },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open('Frais mis à jour', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  // ----- Modes de paiement -----

  ouvrirAjoutMode(): void {
    this.ouvrirFormulaireMode(undefined);
  }
  ouvrirEditionMode(mode: ModePaiement): void {
    this.ouvrirFormulaireMode(mode);
  }
  private ouvrirFormulaireMode(mode: ModePaiement | undefined): void {
    const ref = this.dialog.open<ModePaiementFormDialog, ModePaiementFormDialogData, ModePaiement>(ModePaiementFormDialog, {
      data: { mode },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(mode ? 'Mode de paiement modifié' : 'Mode de paiement ajouté', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerMode(id: string): void {
    if (!confirm('Supprimer ce mode de paiement ?') ) return;
    this.financier.supprimerModePaiement(id).subscribe({
      next: () => {
        this.snackBar.open('Mode de paiement supprimé', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }

  // ----- Partenaires -----

  ouvrirAjoutPartenaire(): void {
    this.ouvrirFormulairePartenaire(undefined);
  }
  ouvrirEditionPartenaire(partenaire: Partenaire): void {
    this.ouvrirFormulairePartenaire(partenaire);
  }
  private ouvrirFormulairePartenaire(partenaire: Partenaire | undefined): void {
    const ref = this.dialog.open<PartenaireFormDialog, PartenaireFormDialogData, Partenaire>(PartenaireFormDialog, {
      data: { partenaire },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(partenaire ? 'Partenaire modifié' : 'Partenaire ajouté', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerPartenaire(id: string): void {
    if (!confirm('Supprimer ce partenaire ?')) return;
    this.financier.supprimerPartenaire(id).subscribe({
      next: () => {
        this.snackBar.open('Partenaire supprimé', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () => this.snackBar.open('Suppression impossible.', 'OK', { duration: 4000 }),
    });
  }
}
