import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ParametrageAcademiqueService } from '../../core/services/parametrage-academique.service';
import { ParametrageFinancierService } from '../../core/services/parametrage-financier.service';
import { NationaliteService } from '../../core/services/nationalite.service';
import { ParcoursService } from '../../core/services/parcours.service';
import { InscriptionsService } from '../../core/services/inscriptions.service';
import { DocumentsService } from '../../core/services/documents.service';
import { PaiementsService } from '../../core/services/paiements.service';
import { EtablissementInfoService } from '../../core/services/etablissement-info.service';
import { AnneeAcademique, Engagement } from '../../core/models/parametrage.models';
import { Classe } from '../../core/models/parcours.models';
import { Civilite, Etudiant, FormulaireAdmission, Inscription } from '../../core/models/inscriptions.models';
import { CalendrierInscription } from '../../core/models/paiements.models';
import { TypeEngagement } from '../../core/models/parametrage.models';
import { EtablissementInfo, Nationalite, Niveau } from '../../core/models/parametrage.models';
import { EditEtudiantDialog, EditEtudiantDialogData } from './edit-etudiant-dialog/edit-etudiant-dialog';
import { ChoisirNiveauDialog, ChoisirNiveauDialogData } from './choisir-niveau-dialog/choisir-niveau-dialog';
import { InscriptionFormDialog, InscriptionFormDialogData } from './inscription-form-dialog/inscription-form-dialog';
import { CandidatFormDialog, CandidatFormDialogData } from './candidat-form-dialog/candidat-form-dialog';
import { EtudiantFicheDialog, EtudiantFicheDialogData } from './etudiant-fiche-dialog/etudiant-fiche-dialog';

@Component({
  selector: 'app-inscriptions',
  standalone: true,
  imports: [FormsModule, MatTabsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatTooltipModule],
  templateUrl: './inscriptions.html',
  styleUrl: './inscriptions.scss',
})
export class InscriptionsPage implements OnInit {
  private readonly inscriptionsService = inject(InscriptionsService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly financier = inject(ParametrageFinancierService);
  private readonly nationaliteService = inject(NationaliteService);
  private readonly documentsService = inject(DocumentsService);
  private readonly paiementsService = inject(PaiementsService);
  private readonly etablissementService = inject(EtablissementInfoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly etudiants = signal<Etudiant[]>([]);
  readonly inscriptions = signal<Inscription[]>([]);
  readonly classes = signal<Classe[]>([]);
  readonly annees = signal<AnneeAcademique[]>([]);
  readonly nationalites = signal<Nationalite[]>([]);
  readonly engagements = signal<Engagement[]>([]);
  readonly niveaux = signal<Niveau[]>([]);
  readonly etablissement = signal<EtablissementInfo | null>(null);
  readonly chargement = signal(true);

  readonly rechercheMatricule = signal('');
  readonly rechercheEtudiant = signal('');

  readonly inscriptionsFiltrees = computed(() => {
    const q = this.rechercheMatricule().trim().toLowerCase();
    if (!q) return this.inscriptions();
    return this.inscriptions().filter((i) => i.etudiant?.matricule.toLowerCase().includes(q));
  });

  readonly etudiantsNonInscrits = computed(() => {
    const inscrits = new Set(this.inscriptions().map((i) => i.etudiant?.id).filter((id): id is string => !!id));
    return this.etudiants().filter((e) => !inscrits.has(e.id));
  });

  /** L'onglet "Admissions" ne montre que les étudiants pas encore inscrits (pipeline
   * admission -> inscription) : une fois inscrit, l'étudiant passe sous la responsabilité
   * de l'onglet "Inscriptions" (qui conserve l'accès fiche/carte/modification). */
  readonly etudiantsFiltres = computed(() => {
    const q = this.rechercheEtudiant().trim().toLowerCase();
    const liste = this.etudiantsNonInscrits();
    if (!q) return liste;
    return liste.filter(
      (e) => e.matricule.toLowerCase().includes(q) || e.nom.toLowerCase().includes(q) || e.prenom.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.charger();
    this.etablissementService.obtenir().subscribe({
      next: (e) => this.etablissement.set(e),
      error: () => this.etablissement.set(null),
    });
  }

  charger(): void {
    this.chargement.set(true);
    forkJoin({
      etudiants: this.inscriptionsService.listerEtudiants(),
      inscriptions: this.inscriptionsService.listerInscriptions(),
      classes: this.parcoursService.listerClasses(),
      annees: this.academique.listerAnnees(),
      nationalites: this.nationaliteService.listerPourAdmin(),
      engagements: this.financier.listerEngagements(),
      niveaux: this.academique.listerNiveaux(),
    }).subscribe({
      next: (r) => {
        this.etudiants.set(r.etudiants);
        this.inscriptions.set(r.inscriptions);
        this.classes.set(r.classes);
        this.annees.set(r.annees);
        this.nationalites.set(r.nationalites);
        this.engagements.set(r.engagements);
        this.niveaux.set(r.niveaux);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirAjoutCandidat(): void {
    const ref = this.dialog.open<CandidatFormDialog, CandidatFormDialogData, FormulaireAdmission>(CandidatFormDialog, {
      width: '820px',
      maxWidth: '95vw',
      data: { nationalites: this.nationalites() },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      const nom = resultat.etudiant ? `${resultat.etudiant.prenom} ${resultat.etudiant.nom}` : `${resultat.candidat.prenom} ${resultat.candidat.nom}`;
      this.snackBar.open(`${nom} admis(e)`, 'OK', { duration: 3000 });
      this.charger();
    });
  }

  /** "Ajouter" demande d'abord le niveau (modal), qui filtre les classes proposées dans le
   * formulaire d'inscription (lui-même un modal) - comme sur la plateforme de référence. */
  ouvrirAjoutInscription(): void {
    this.choisirNiveauPuisOuvrir();
  }

  /** Depuis l'onglet "Étudiants non inscrits" : même parcours (choix du niveau puis
   * formulaire), mais l'étudiant cliqué est déjà déterminé. */
  inscrireEtudiant(etudiant: Etudiant): void {
    this.choisirNiveauPuisOuvrir(etudiant);
  }

  private choisirNiveauPuisOuvrir(etudiantPreselectionne?: Etudiant): void {
    const ref = this.dialog.open<ChoisirNiveauDialog, ChoisirNiveauDialogData, string>(ChoisirNiveauDialog, {
      data: { niveaux: this.niveaux() },
    });
    ref.afterClosed().subscribe((niveauId) => {
      if (!niveauId) return;
      this.ouvrirFormulaireInscription(niveauId, undefined, etudiantPreselectionne);
    });
  }

  /** Reouvre le meme formulaire que la creation, pre-rempli avec l'inscription et son
   * calendrier previsionnel existants - l'etudiant reste fixe (voir ModifierInscriptionRequest). */
  ouvrirEditionInscription(inscription: Inscription): void {
    this.ouvrirFormulaireInscription(null, inscription, undefined);
  }

  private ouvrirFormulaireInscription(
    niveauId: string | null,
    inscription: Inscription | undefined,
    etudiantPreselectionne: Etudiant | undefined,
  ): void {
    const ref = this.dialog.open<InscriptionFormDialog, InscriptionFormDialogData, Inscription>(InscriptionFormDialog, {
      width: '1280px',
      maxWidth: '95vw',
      data: {
        niveauId,
        classes: this.classes(),
        // Création : seuls les étudiants non déjà inscrits doivent être proposés.
        // Édition : la liste complète, pour que l'étudiant (verrouillé) reste affiché.
        etudiants: inscription ? this.etudiants() : this.etudiantsNonInscrits(),
        annees: this.annees(),
        engagements: this.engagements(),
        inscription,
        etudiantPreselectionne,
      },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(inscription ? 'Inscription mise à jour' : 'Inscription créée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  ouvrirFicheEtudiant(etudiant: Etudiant): void {
    this.dialog.open<EtudiantFicheDialog, EtudiantFicheDialogData>(EtudiantFicheDialog, {
      width: '960px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { etudiant, nationalites: this.nationalites() },
    });
  }

  ouvrirEditionEtudiant(etudiant: Etudiant): void {
    const ref = this.dialog.open<EditEtudiantDialog, EditEtudiantDialogData, Etudiant>(EditEtudiantDialog, {
      width: '720px',
      maxWidth: '90vw',
      data: { etudiant, nationalites: this.nationalites() },
    });
    ref.afterClosed().subscribe((maj) => {
      if (maj) {
        this.snackBar.open(`${maj.prenom} ${maj.nom} mis à jour`, 'OK', { duration: 3000 });
        this.charger();
      }
    });
  }

  supprimerEtudiant(etudiant: Etudiant): void {
    if (!confirm(`Supprimer l'étudiant ${etudiant.prenom} ${etudiant.nom} ? Cette action est irréversible.`)) return;
    this.inscriptionsService.supprimerEtudiant(etudiant.id).subscribe({
      next: () => {
        this.snackBar.open('Étudiant supprimé', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () =>
        this.snackBar.open(
          'Suppression impossible : des inscriptions, bulletins ou paiements sont liés à cet étudiant.',
          'OK',
          { duration: 4000 },
        ),
    });
  }

  exporterEtudiants(): void {
    this.inscriptionsService.exporterEtudiants().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = 'etudiants.xlsx';
        lien.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.snackBar.open("L'export a échoué, réessayez.", 'OK', { duration: 3000 }),
    });
  }

  /** Classe (+ niveau) de l'etudiant d'une ligne "Inscriptions" - la classe embarquee sur
   * Inscription n'a pas le niveau, on la recroise avec la liste complete des classes. */
  classeDeInscription(inscription: Inscription): Classe | null {
    return this.classes().find((c) => c.id === inscription.classe?.id) ?? null;
  }

  /** Carte étudiante - générée côté client dans une fenêtre dédiée, comme l'impression de la
   * fiche étudiant : pas de PDF côté serveur pour un document aussi simple, et qrcodejs (CDN)
   * fait le rendu du QR code. Nom/prénom/année scolaire/n° carte restent visibles en texte ;
   * matricule, classe, niveau et n° carte sont en plus embarqués dans le QR. Le n° carte
   * n'existe que pour une inscription (CarteEtudiant est lié 1-1 à Inscription) : l'onglet
   * "Admissions" (étudiant pas encore inscrit) n'en fournit pas d'id, la carte s'imprime
   * alors sans numéro. */
  imprimerCarteEtudiant(etudiant: Etudiant, classe?: Classe | null, inscriptionId?: string): void {
    if (!inscriptionId) {
      this.ouvrirFenetreCarte(etudiant, classe ?? null, null);
      return;
    }
    this.inscriptionsService.obtenirCarte(inscriptionId).subscribe({
      next: (carte) => this.ouvrirFenetreCarte(etudiant, classe ?? null, carte.numero),
      error: () => this.ouvrirFenetreCarte(etudiant, classe ?? null, null),
    });
  }

  private ouvrirFenetreCarte(etudiant: Etudiant, classe: Classe | null, numeroCarte: string | null): void {
    const fenetre = window.open('', '_blank', 'width=500,height=400');
    if (!fenetre) return;
    fenetre.document.write(this.genererHtmlCarte(etudiant, classe, numeroCarte));
    fenetre.document.close();
  }

  private genererHtmlCarte(etudiant: Etudiant, classe: Classe | null, numeroCarte: string | null): string {
    const etab = this.etablissement();
    const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const logo = etab?.logo ? `<img src="${echapper(etab.logo)}" alt="" class="logo" />` : '';
    const photo = etudiant.photo
      ? `<img src="${echapper(etudiant.photo)}" alt="" class="photo" />`
      : `<div class="photo photo-vide">👤</div>`;
    const contenuQr = [
      `Matricule: ${etudiant.matricule}`,
      `Classe: ${classe?.libelle ?? '—'}`,
      `Niveau: ${classe?.niveauLibelle ?? '—'}`,
      `Carte: ${numeroCarte ?? '—'}`,
    ].join('\n');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Carte étudiante — ${echapper(etudiant.nom)} ${echapper(etudiant.prenom)}</title>
      <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
      <style>
        @page { size: 90mm 56mm; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Helvetica, Arial, sans-serif; background: #eef0f3; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .carte { width: 85.6mm; height: 54mm; border-radius: 3mm; background: linear-gradient(135deg, #fff 0%, #f2f4f8 100%); border: 1px solid #c8ccd2; box-shadow: 0 2px 6px rgba(0,0,0,0.15); padding: 3mm 4mm; display: flex; flex-direction: column; }
        .entete { display: flex; align-items: center; gap: 2mm; border-bottom: 1.5px solid #1a237e; padding-bottom: 1.5mm; margin-bottom: 2mm; }
        .entete .logo { height: 7mm; max-width: 10mm; object-fit: contain; }
        .entete .nom-etab { font-size: 8pt; font-weight: bold; color: #1a237e; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.15; }
        .entete .titre-carte { margin-left: auto; font-size: 6.5pt; font-weight: bold; color: #fff; background: #1a237e; padding: 1mm 2mm; border-radius: 2mm; white-space: nowrap; }
        .corps { display: flex; gap: 3mm; flex: 1; min-height: 0; }
        .photo { width: 16mm; height: 20mm; border-radius: 1.5mm; object-fit: cover; background: #dfe3e8; flex-shrink: 0; }
        .photo-vide { display: flex; align-items: center; justify-content: center; font-size: 12mm; color: #aab0b8; }
        .identite { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 1mm; }
        .identite .nom { font-size: 10.5pt; font-weight: bold; color: #1d2129; text-transform: uppercase; line-height: 1.2; }
        .identite .prenom { font-size: 9pt; color: #1d2129; line-height: 1.2; }
        .identite .ligne { font-size: 6.8pt; color: #565f6b; margin-top: 1mm; }
        .identite .ligne strong { color: #1d2129; font-weight: 600; }
        .pied { margin-top: 1.5mm; display: flex; justify-content: center; }
        .pied .qr-code { width: 16mm; height: 16mm; }
        .pied .qr-code canvas, .pied .qr-code img { width: 100%; height: 100%; }
      </style>
    </head><body>
      <div class="carte">
        <div class="entete">
          ${logo}
          <div class="nom-etab">${echapper(etab?.nom || 'Établissement')}</div>
          <div class="titre-carte">Carte étudiant</div>
        </div>
        <div class="corps">
          ${photo}
          <div class="identite">
            <div class="nom">${echapper(etudiant.nom)}</div>
            <div class="prenom">${echapper(etudiant.prenom)}</div>
            <div class="ligne"><strong>Année scolaire :</strong> ${echapper(classe?.anneeAcademiqueLibelle ?? '—')}</div>
            <div class="ligne"><strong>N° carte :</strong> ${echapper(numeroCarte ?? '—')}</div>
          </div>
        </div>
        <div class="pied">
          <div id="qr-code" class="qr-code"></div>
        </div>
      </div>
      <script>
        new QRCode(document.getElementById('qr-code'), {
          text: ${JSON.stringify(contenuQr)},
          width: 140,
          height: 140,
          correctLevel: QRCode.CorrectLevel.M,
        });
        window.onload = () => window.print();
      <\/script>
    </body></html>`;
  }

  /** Genere (ou reutilise le meme flux que Documents) un certificat/attestation d'inscription
   * et l'ouvre directement dans un nouvel onglet, sans passer par l'ecran Documents. */
  genererCertificat(inscription: Inscription): void {
    const etudiantId = inscription.etudiant?.id;
    if (!etudiantId) {
      return;
    }
    this.documentsService.generer({ etudiantId, type: 'ATTESTATION_INSCRIPTION' }).subscribe({
      next: (document) => {
        this.documentsService.telechargerPdf(document.id).subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
          },
          error: () => this.snackBar.open('Impossible de générer le PDF', 'OK', { duration: 3000 }),
        });
      },
      error: () => this.snackBar.open("La génération du certificat a échoué", 'OK', { duration: 3000 }),
    });
  }

  /** Fiche d'inscription - générée côté client comme la fiche étudiant et la carte : le
   * tableau "Mois / Montant prévue" et le détail des engagements reprennent tels quels le
   * calendrier prévisionnel (EcheancePrevue) construit à l'inscription, via le même endpoint
   * que l'écran Paiements (voir PaiementsService.calendrier). */
  imprimerFicheInscription(inscription: Inscription): void {
    if (!inscription.etudiant) return;
    this.paiementsService.calendrier(inscription.id).subscribe({
      next: (calendrier) => {
        const fenetre = window.open('', '_blank', 'width=900,height=1000');
        if (!fenetre) return;
        fenetre.document.write(this.genererHtmlFicheInscription(inscription, calendrier));
        fenetre.document.close();
        fenetre.onload = () => {
          fenetre.focus();
          fenetre.print();
        };
      },
      error: () => this.snackBar.open('Impossible de charger le calendrier prévisionnel de cette inscription.', 'OK', { duration: 3000 }),
    });
  }

  private readonly LIBELLES_CIVILITE: Record<Civilite, string> = { M: 'Monsieur', MME: 'Madame', MLLE: 'Mademoiselle' };

  /** Les 6 postes affichés sous "Engagements", dans cet ordre - sommés depuis le calendrier
   * prévisionnel de l'inscription (un même type peut être réparti sur plusieurs échéances). */
  private readonly POSTES_ENGAGEMENT: { type: TypeEngagement; label: string }[] = [
    { type: 'INSCRIPTION', label: "Frais d'inscription" },
    { type: 'SCOLARITE', label: 'Scolarité annuelle' },
    { type: 'EXAMEN', label: 'Frais examen' },
    { type: 'SOUTENANCE', label: 'Frais soutenance' },
    { type: 'UNIFORME', label: 'Frais uniforme' },
    { type: 'ASSURANCE', label: 'Frais assurance' },
  ];

  private genererHtmlFicheInscription(inscription: Inscription, calendrier: CalendrierInscription): string {
    const e = inscription.etudiant!;
    const etab = this.etablissement();
    const echapper = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const champ = (label: string, valeur: string | number | null | undefined) =>
      `<span class="champ"><strong>${echapper(label)} :</strong> ${valeur !== null && valeur !== undefined ? echapper(String(valeur)) : ''}</span>`;
    const ligne = (champs: string[]) => `<div class="ligne">${champs.join('')}</div>`;

    const nationalite = this.nationalites().find((n) => n.code === e.nationaliteCode)?.libelle ?? e.nationaliteCode ?? '';
    const civiliteLibelle = e.civilite ? this.LIBELLES_CIVILITE[e.civilite] : '';
    const tuteur = e.tuteurs?.[0] ?? null;
    const nomComplet = `${civiliteLibelle} ${e.nom.toUpperCase()} ${e.prenom}`.trim();

    const montantParType = new Map<TypeEngagement, number>();
    for (const ec of calendrier.echeances) {
      montantParType.set(ec.type, (montantParType.get(ec.type) ?? 0) + ec.montantPrevu);
    }
    const lignesEngagement = this.POSTES_ENGAGEMENT.map(
      (p) => `<div class="ligne-engagement">${echapper(p.label)}: <strong>${montantParType.get(p.type) ?? 0} Fcfa</strong></div>`,
    ).join('');

    const moisAnnee = (date: string) => {
      const d = new Date(date);
      const libelle = d.toLocaleDateString('fr-FR', { month: 'long' });
      return libelle.charAt(0).toUpperCase() + libelle.slice(1);
    };
    const lignesCalendrier = calendrier.echeances.length
      ? calendrier.echeances
          .map((ec) => `<tr><td>${echapper(moisAnnee(ec.dateEcheance))}</td><td class="numeric">${ec.montantPrevu}</td></tr>`)
          .join('')
      : `<tr><td colspan="2" class="muted">Aucune échéance programmée</td></tr>`;

    const logo = etab?.logo ? `<img src="${echapper(etab.logo)}" alt="" class="logo-etab" />` : '';
    const dateDuJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

    return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Fiche d'inscription — ${echapper(e.nom)} ${echapper(e.prenom)}</title>
      <style>
        @page { size: A4; margin: 1.4cm; }
        body { font-family: Helvetica, Arial, sans-serif; color: #1d2129; font-size: 9.5pt; }
        .entete { display: flex; align-items: center; gap: 14px; margin-bottom: 4px; }
        .logo-etab { height: 50px; max-width: 70px; object-fit: contain; }
        .entete h1 { flex: 1; text-align: center; font-size: 15.5pt; text-decoration: underline; margin: 0; }
        .entete .spacer { width: 70px; }
        .meta { display: flex; justify-content: space-between; font-size: 9.5pt; margin-bottom: 10px; }
        .section { position: relative; border: 1px solid #9aa1ab; border-radius: 4px; margin: 16px 0 10px; padding: 12px 14px 8px; break-inside: avoid; }
        .badge { position: absolute; top: -11px; left: 10px; background: #1a237e; color: #fff; font-weight: bold; font-size: 9pt; padding: 3px 10px; border-radius: 3px; }
        .corps { margin-top: 4px; }
        .ligne { display: flex; flex-wrap: wrap; gap: 4px 28px; margin-bottom: 6px; }
        .ligne:last-child { margin-bottom: 0; }
        .champ strong { font-weight: 700; }
        .sous-boites { display: flex; gap: 14px; margin-top: 8px; }
        .sous-boite { flex: 1; border: 1px solid #c3c8d0; border-radius: 4px; padding: 8px 10px; }
        .sous-boite .titre { font-weight: 700; font-size: 8.5pt; text-transform: uppercase; color: #4a5260; margin-bottom: 4px; }
        .sous-boite .champ { display: block; margin-bottom: 3px; }
        .deux-colonnes { display: flex; gap: 18px; }
        .deux-colonnes > div { flex: 1; }
        .ligne-engagement { margin-bottom: 4px; }
        .bloc-aviseur p { margin: 0 0 6px; }
        .note-paiement { font-weight: 700; margin: 14px 0 6px; }
        .bas-page { display: flex; gap: 16px; align-items: stretch; }
        .calendrier-table { border-collapse: collapse; }
        .calendrier-table th, .calendrier-table td { border: 1px solid #9aa1ab; padding: 4px 10px; font-size: 9pt; }
        .calendrier-table th { background: #1a237e; color: #fff; }
        .calendrier-table td.numeric { text-align: right; }
        .reglement { flex: 1; border: 1px solid #9aa1ab; border-radius: 4px; padding: 8px 10px; font-size: 8.3pt; }
        .reglement .titre { font-weight: 700; margin-bottom: 4px; }
        .reglement p { margin: 0 0 5px; text-align: justify; }
        .pied-signatures { display: flex; justify-content: space-between; margin-top: 30px; font-weight: 700; font-size: 9.5pt; }
      </style>
    </head><body>
      <div class="entete">${logo}<h1>Fiche d'inscription ${echapper(inscription.anneeAcademique?.libelle ?? '')}</h1><div class="spacer"></div></div>
      <div class="meta"><span>N° inscription : <strong>${inscription.numero}</strong></span><span>Fait le : ${dateDuJour}</span></div>

      <div class="section">
        <span class="badge">Identification de l'apprenant</span>
        <div class="corps">
          ${ligne([champ('Matricule', e.matricule), champ('Prénom et Nom', nomComplet)])}
          ${ligne([champ('Né(e) le', e.dateNaissance), champ('à', e.lieuNaissance)])}
          ${ligne([champ('Adresse', e.adresse)])}
          ${ligne([champ('Nationalité', nationalite), champ('Situation matrimoniale', e.situationMatrimoniale?.toLowerCase())])}
          ${ligne([champ('Tél. portable', e.contact), champ('Email', e.email)])}
          <div class="sous-boites">
            <div class="sous-boite">
              <div class="titre">Ancienne scolarité</div>
              <span class="champ">${champ('Établissement', e.cursusAnterieur?.dernierEtablissement)}</span>
              <span class="champ">${champ('Diplôme/Titre', e.cursusAnterieur?.diplomeTitre)}</span>
              <span class="champ">${champ('Année freq.', e.cursusAnterieur?.annee)}</span>
            </div>
            <div class="sous-boite">
              <div class="titre">Prise en charge</div>
              <span class="champ">${champ('Type inscription', null)}</span>
              <span class="champ">${champ('Nature bourse', null)}</span>
              <span class="champ">${champ('Note', null)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <span class="badge">Identification Tuteur ou de l'entreprise</span>
        <div class="corps deux-colonnes">
          <div>${champ('R. social', e.infosProfessionnelles?.societe)}<br />${champ('Adresse société', e.infosProfessionnelles?.adresseSociete)}</div>
          <div>${champ('Tuteur', tuteur?.nom)}<br />${champ('Tél. tuteur', tuteur?.telephone)}</div>
        </div>
      </div>

      <div class="section">
        <span class="badge">Engagements</span>
        <div class="corps deux-colonnes">
          <div class="bloc-aviseur">
            <p>Je soussigné : ${echapper(civiliteLibelle)} <strong>${echapper(e.nom.toUpperCase())} ${echapper(e.prenom)}</strong> m'engage à payer le coût annuel de ma scolarité ainsi libellé :</p>
            ${lignesEngagement}
          </div>
          <div class="bloc-aviseur">
            <p>Je soussigné : <strong>${echapper(tuteur?.nom ?? '')}</strong> m'engage à aviser le paiement de la scolarité de : ${echapper(civiliteLibelle)} <strong>${echapper(e.nom.toUpperCase())} ${echapper(e.prenom)}</strong>.</p>
            <p>Libellé ci-contre pour un montant de : En chiffre : <strong>${calendrier.totalPrevu} Fcfa</strong></p>
          </div>
        </div>
      </div>

      <p class="note-paiement">Paiement avant le 5 de chaque mois au plus tard</p>
      <div class="bas-page">
        <table class="calendrier-table"><thead><tr><th>Mois</th><th>Montant prévue</th></tr></thead><tbody>${lignesCalendrier}</tbody></table>
        <div class="reglement">
          <div class="titre">Extrait du règlement intérieur</div>
          <p>L'inscription sera comptabilisée après règlement des frais et aucune somme ne sera remboursée, sauf si, pour des raisons d'effectif, la session n'est pas ouverte.</p>
          <p>Toute inscription rend obligatoire le coût annuel de la formation. Toute autre modalité de règlement ne constitue que des facilités accordées aux apprenants qui le demandent.</p>
          <p>L'apprenant s'engage à fournir toutes les pièces requises pour son inscription ou à compléter les pièces manquantes, et atteste qu'elles sont toutes authentiques et légales. À défaut de cela, il engage sa responsabilité pénale et l'institut ne sera pas tenu de délivrer une quelconque attestation ou diplôme pour sa formation.</p>
        </div>
      </div>

      <div class="pied-signatures"><span>APPRENANT</span><span>TUTEUR</span><span>DIRECTION DES ÉTUDES</span><span>LA CAISSE</span></div>
    </body></html>`;
  }

  supprimerInscription(inscription: Inscription): void {
    const nom = inscription.etudiant ? `${inscription.etudiant.prenom} ${inscription.etudiant.nom}` : 'cette inscription';
    if (!confirm(`Supprimer l'inscription de ${nom} ? Cette action est irréversible.`)) return;
    this.inscriptionsService.supprimerInscription(inscription.id).subscribe({
      next: () => {
        this.snackBar.open('Inscription supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () =>
        this.snackBar.open(
          "Suppression impossible : des paiements ou échéances sont liés à cette inscription.",
          'OK',
          { duration: 4000 },
        ),
    });
  }
}
