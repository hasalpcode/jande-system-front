import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { EvaluationsService } from '../../core/services/evaluations.service';
import { ParcoursService } from '../../core/services/parcours.service';
import { ParametrageAcademiqueService } from '../../core/services/parametrage-academique.service';
import { AuthService } from '../../core/services/auth.service';
import { EtablissementInfoService } from '../../core/services/etablissement-info.service';
import { Classe } from '../../core/models/parcours.models';
import { EtablissementInfo, Semestre } from '../../core/models/parametrage.models';
import {
  BulletinDetailResponse,
  BulletinResponse,
  ConseilClasseResponse,
  LigneNoteClasseResponse,
  MatiereResponse,
  SaisieNoteEtudiantRequest,
  UniteEnseignementCurriculumResponse,
} from '../../core/models/evaluations.models';
import { Etudiant } from '../../core/models/inscriptions.models';
import { MatiereFormDialog, MatiereFormDialogData } from './matiere-form-dialog/matiere-form-dialog';

type Vue = 'classes' | 'etudiants' | 'bulletins' | 'bulletin' | 'conseil' | 'saisie';

@Component({
  selector: 'app-evaluations',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './evaluations.html',
  styleUrl: './evaluations.scss',
})
export class EvaluationsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly evaluationsService = inject(EvaluationsService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly authService = inject(AuthService);
  private readonly etablissementService = inject(EtablissementInfoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly session = this.authService.currentSession;
  readonly etablissement = signal<EtablissementInfo | null>(null);

  readonly chargement = signal(true);
  readonly vue = signal<Vue>('classes');

  readonly classes = signal<Classe[]>([]);
  readonly semestres = signal<Semestre[]>([]);

  readonly classeSelectionnee = signal<Classe | null>(null);
  readonly etudiants = signal<Etudiant[]>([]);
  readonly chargementEtudiants = signal(false);
  readonly rechercheEtudiant = signal('');

  readonly etudiantsFiltres = computed(() => {
    const terme = this.rechercheEtudiant().trim().toLowerCase();
    if (!terme) return this.etudiants();
    return this.etudiants().filter(
      (e) =>
        e.nom.toLowerCase().includes(terme) ||
        e.prenom.toLowerCase().includes(terme) ||
        e.matricule.toLowerCase().includes(terme),
    );
  });

  readonly etudiantSelectionne = signal<Etudiant | null>(null);
  readonly bulletins = signal<BulletinResponse[]>([]);
  readonly chargementBulletins = signal(false);
  readonly panneauNouveauBulletin = signal(false);

  readonly bulletinCourant = signal<BulletinDetailResponse | null>(null);
  readonly chargementBulletin = signal(false);
  readonly panneauAppreciation = signal(false);

  readonly semestresDeLaClasse = computed(() => {
    const classe = this.classeSelectionnee();
    if (!classe) return [];
    return this.semestres().filter((s) => s.anneeAcademiqueId === classe.anneeAcademiqueId);
  });

  // ----- Conseil de classe : bilan collectif des bulletins d'une classe pour un semestre -----

  readonly conseilClasse = signal<Classe | null>(null);
  readonly conseilSemestreId = signal<string | null>(null);
  readonly conseilBulletins = signal<BulletinResponse[]>([]);
  /** Détail par UE/EC du conseil de classe (une moyenne par EC et un statut par UE, pour
   * chaque étudiant) - chargé en même temps que conseilBulletins, affiché en complément du
   * tableau "moyenne générale". */
  readonly conseilDetail = signal<ConseilClasseResponse | null>(null);
  readonly chargementConseil = signal(false);

  readonly semestresDeLaClasseConseil = computed(() => {
    const classe = this.conseilClasse();
    if (!classe) return [];
    return this.semestres().filter((s) => s.anneeAcademiqueId === classe.anneeAcademiqueId);
  });

  readonly semestreConseilLibelle = computed(
    () => this.semestresDeLaClasseConseil().find((s) => s.id === this.conseilSemestreId())?.libelle ?? '',
  );

  readonly moyenneConseil = computed(() => {
    const b = this.conseilBulletins();
    if (!b.length) return null;
    return Math.round((b.reduce((total, x) => total + x.moyenneGenerale, 0) / b.length) * 100) / 100;
  });

  readonly tauxReussiteConseil = computed(() => {
    const b = this.conseilBulletins();
    if (!b.length) return null;
    return Math.round((b.filter((x) => x.semestreValide).length / b.length) * 1000) / 10;
  });

  /** Moyenne de la classe pour chaque EC (moyenne des moyennes des étudiants notés sur cet
   * EC, en ignorant ceux sans note) - alignée sur l'ordre des EC de chaque UE. */
  readonly moyennesClasseParUe = computed(() => {
    const detail = this.conseilDetail();
    if (!detail) return [];
    return detail.unitesEnseignement.map((ue) =>
      ue.elementsConstitutifs.map((_, ecIndex) => {
        const valeurs = ue.etudiants
          .map((e) => e.moyennesParEc[ecIndex])
          .filter((v): v is number => v !== null && v !== undefined);
        return valeurs.length ? Math.round((valeurs.reduce((a, v) => a + v, 0) / valeurs.length) * 100) / 100 : null;
      }),
    );
  });

  /** Une ligne PAR ÉTUDIANT (pas par EC) : à l'échelle réelle (5 UE, 10 EC, 100 étudiants),
   * un format "1 ligne = 1 (UE, EC, étudiant)" produirait 1000 lignes - inutilisable pour un
   * conseil de classe, où on lit les résultats étudiant par étudiant, toutes matières sur
   * une même ligne. Ici : 100 lignes, chaque UE regroupant ses EC en colonnes (comme un
   * tableur de notes) - le format qui scale et qui se lit naturellement à cette taille. */
  readonly lignesConseilCombinees = computed(() => {
    const detail = this.conseilDetail();
    if (!detail || !detail.unitesEnseignement.length) return [];
    return detail.unitesEnseignement[0].etudiants.map((base) => ({
      etudiantId: base.etudiantId,
      nomComplet: base.nomComplet,
      matricule: base.matricule,
      parUe: detail.unitesEnseignement.map((ue) => {
        const ligne = ue.etudiants.find((e) => e.etudiantId === base.etudiantId);
        return {
          moyennesParEc: ligne?.moyennesParEc ?? ue.elementsConstitutifs.map(() => null),
          valide: ligne?.valide ?? false,
          moyenneUe: ligne?.moyenneUe ?? null,
        };
      }),
    }));
  });

  readonly formBulletin = this.fb.nonNullable.group({
    semestreId: ['', Validators.required],
  });

  readonly formConseil = this.fb.nonNullable.group({
    semestreId: ['', Validators.required],
  });

  readonly formAppreciation = this.fb.nonNullable.group({
    appreciationConseilClasse: [''],
  });

  ngOnInit(): void {
    this.chargement.set(true);
    forkJoin({
      classes: this.parcoursService.listerClasses(),
      semestres: this.academique.listerSemestres(),
    }).subscribe({
      next: (r) => {
        this.classes.set(r.classes);
        this.semestres.set(r.semestres);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
    this.etablissementService.obtenir().subscribe({
      next: (e) => this.etablissement.set(e),
      error: () => this.etablissement.set(null),
    });
  }

  ouvrirClasse(classe: Classe): void {
    this.classeSelectionnee.set(classe);
    this.conseilClasse.set(null);
    this.saisieClasse.set(null);
    this.vue.set('etudiants');
    this.rechercheEtudiant.set('');
    this.chargementEtudiants.set(true);
    this.parcoursService.listerEtudiantsDeClasse(classe.id).subscribe({
      next: (etudiants) => {
        this.etudiants.set(etudiants);
        this.chargementEtudiants.set(false);
      },
      error: () => this.chargementEtudiants.set(false),
    });
  }

  retourClasses(): void {
    this.vue.set('classes');
    this.classeSelectionnee.set(null);
    this.etudiantSelectionne.set(null);
    this.conseilClasse.set(null);
    this.conseilSemestreId.set(null);
    this.conseilBulletins.set([]);
    this.conseilDetail.set(null);
    this.saisieClasse.set(null);
    this.saisieSemestreId.set(null);
    this.saisieElementConstitutifId.set(null);
    this.curriculumSaisie.set([]);
    this.lignesSaisie.clear();
  }

  ouvrirEtudiant(etudiant: Etudiant): void {
    this.etudiantSelectionne.set(etudiant);
    this.vue.set('bulletins');
    this.chargerBulletins();
  }

  retourEtudiants(): void {
    this.vue.set('etudiants');
    this.etudiantSelectionne.set(null);
    this.panneauNouveauBulletin.set(false);
  }

  private chargerBulletins(): void {
    const etudiant = this.etudiantSelectionne();
    if (!etudiant) return;
    this.chargementBulletins.set(true);
    this.evaluationsService.listerBulletins(etudiant.id).subscribe({
      next: (bulletins) => {
        this.bulletins.set(bulletins);
        this.chargementBulletins.set(false);
      },
      error: () => this.chargementBulletins.set(false),
    });
  }

  creerBulletin(): void {
    if (this.formBulletin.invalid) return this.formBulletin.markAllAsTouched();
    const etudiant = this.etudiantSelectionne();
    const classe = this.classeSelectionnee();
    if (!etudiant || !classe) return;
    const { semestreId } = this.formBulletin.getRawValue();
    this.evaluationsService.creerBulletin({ etudiantId: etudiant.id, classeId: classe.id, semestreId }).subscribe((bulletin) => {
      this.formBulletin.reset();
      this.panneauNouveauBulletin.set(false);
      this.chargerBulletins();
      this.ouvrirBulletin(bulletin);
    });
  }

  ouvrirBulletin(bulletin: BulletinResponse): void {
    this.chargerBulletinDetail(bulletin);
  }

  private chargerBulletinDetail(bulletin: BulletinResponse): void {
    this.vue.set('bulletin');
    this.chargementBulletin.set(true);
    this.panneauAppreciation.set(false);
    this.evaluationsService.detailBulletin(bulletin.id).subscribe({
      next: (detail) => {
        this.bulletinCourant.set(detail);
        this.chargementBulletin.set(false);
      },
      error: () => this.chargementBulletin.set(false),
    });
  }

  retourBulletins(): void {
    this.bulletinCourant.set(null);
    this.vue.set('bulletins');
  }

  // ----- Conseil de classe -----

  ouvrirConseilClasse(classe: Classe): void {
    this.classeSelectionnee.set(null);
    this.etudiantSelectionne.set(null);
    this.saisieClasse.set(null);
    this.conseilClasse.set(classe);
    this.conseilSemestreId.set(null);
    this.conseilBulletins.set([]);
    this.conseilDetail.set(null);
    this.formConseil.reset();
    this.vue.set('conseil');
  }

  /** Revient au tableau du conseil (semestre déjà choisi ou pas) sans réinitialiser ce qui
   * a déjà été chargé - utilisé par le fil d'Ariane depuis le détail d'un bulletin. */
  allerConseil(): void {
    this.bulletinCourant.set(null);
    this.vue.set('conseil');
  }

  retourClassesDepuisConseil(): void {
    this.vue.set('classes');
    this.conseilClasse.set(null);
    this.conseilSemestreId.set(null);
    this.conseilBulletins.set([]);
    this.conseilDetail.set(null);
  }

  changerSemestreConseil(): void {
    this.conseilSemestreId.set(null);
    this.conseilBulletins.set([]);
    this.conseilDetail.set(null);
  }

  imprimerConseil(): void {
    window.print();
  }

  voirConseil(): void {
    if (this.formConseil.invalid) return this.formConseil.markAllAsTouched();
    const { semestreId } = this.formConseil.getRawValue();
    this.conseilSemestreId.set(semestreId);
    this.chargerConseil();
  }

  private chargerConseil(): void {
    const classe = this.conseilClasse();
    const semestreId = this.conseilSemestreId();
    if (!classe || !semestreId) return;
    this.chargementConseil.set(true);
    forkJoin({
      bulletins: this.evaluationsService.listerBulletinsClasse(classe.id, semestreId),
      detail: this.evaluationsService.conseilClasse(classe.id, semestreId),
    }).subscribe({
      next: ({ bulletins, detail }) => {
        this.conseilBulletins.set(bulletins);
        this.conseilDetail.set(detail);
        this.chargementConseil.set(false);
      },
      error: () => this.chargementConseil.set(false),
    });
  }

  // ----- Saisie des notes par classe (+ import Excel) -----
  // Noter toute une classe pour un EC en une seule grille, plutôt que bulletin par bulletin -
  // le parcours est : classe -> semestre -> EC (choisi dans le curriculum du semestre) ->
  // grille éditable, pré-remplie avec les notes déjà enregistrées.

  readonly saisieClasse = signal<Classe | null>(null);
  readonly saisieSemestreId = signal<string | null>(null);
  readonly saisieElementConstitutifId = signal<string | null>(null);
  readonly curriculumSaisie = signal<UniteEnseignementCurriculumResponse[]>([]);
  readonly chargementCurriculumSaisie = signal(false);
  readonly chargementGrilleSaisie = signal(false);
  readonly enregistrementGrilleSaisie = signal(false);
  readonly importEnCoursSaisie = signal(false);

  readonly semestresDeLaClasseSaisie = computed(() => {
    const classe = this.saisieClasse();
    if (!classe) return [];
    return this.semestres().filter((s) => s.anneeAcademiqueId === classe.anneeAcademiqueId);
  });

  readonly ecChoisiSaisie = computed(() => {
    const id = this.saisieElementConstitutifId();
    for (const ue of this.curriculumSaisie()) {
      const ec = ue.elementsConstitutifs.find((e) => e.id === id);
      if (ec) return { ...ec, ueIntitule: ue.ueIntitule };
    }
    return null;
  });

  readonly formSaisieSemestre = this.fb.nonNullable.group({ semestreId: ['', Validators.required] });
  readonly formSaisieEc = this.fb.nonNullable.group({ elementConstitutifId: ['', Validators.required] });
  readonly formGrilleSaisie = this.fb.nonNullable.group({
    lignes: this.fb.nonNullable.array<ReturnType<typeof this.creerLigneSaisie>>([]),
  });

  get lignesSaisie() {
    return this.formGrilleSaisie.controls.lignes;
  }

  private creerLigneSaisie(ligne: LigneNoteClasseResponse) {
    return this.fb.nonNullable.group({
      etudiantId: [ligne.etudiantId],
      nomComplet: [ligne.nomComplet],
      matricule: [ligne.matricule],
      cc: this.fb.control<number | null>(ligne.cc),
      examen: this.fb.control<number | null>(ligne.examen),
      rattrapage: this.fb.control<number | null>(ligne.rattrapage),
      presence: [ligne.presence],
    });
  }

  ouvrirSaisieClasse(classe: Classe): void {
    this.classeSelectionnee.set(null);
    this.etudiantSelectionne.set(null);
    this.conseilClasse.set(null);
    this.saisieClasse.set(classe);
    this.saisieSemestreId.set(null);
    this.saisieElementConstitutifId.set(null);
    this.curriculumSaisie.set([]);
    this.lignesSaisie.clear();
    this.formSaisieSemestre.reset();
    this.formSaisieEc.reset();
    this.vue.set('saisie');
  }

  retourClassesDepuisSaisie(): void {
    this.vue.set('classes');
    this.saisieClasse.set(null);
    this.saisieSemestreId.set(null);
    this.saisieElementConstitutifId.set(null);
    this.curriculumSaisie.set([]);
    this.lignesSaisie.clear();
  }

  choisirSemestreSaisie(): void {
    if (this.formSaisieSemestre.invalid) return this.formSaisieSemestre.markAllAsTouched();
    const { semestreId } = this.formSaisieSemestre.getRawValue();
    this.saisieSemestreId.set(semestreId);
    this.saisieElementConstitutifId.set(null);
    this.lignesSaisie.clear();
    this.formSaisieEc.reset();
    this.chargementCurriculumSaisie.set(true);
    this.evaluationsService.curriculumSemestre(semestreId).subscribe({
      next: (curriculum) => {
        this.curriculumSaisie.set(curriculum);
        this.chargementCurriculumSaisie.set(false);
      },
      error: () => this.chargementCurriculumSaisie.set(false),
    });
  }

  changerSemestreSaisie(): void {
    this.saisieSemestreId.set(null);
    this.saisieElementConstitutifId.set(null);
    this.curriculumSaisie.set([]);
    this.lignesSaisie.clear();
  }

  choisirEcSaisie(): void {
    if (this.formSaisieEc.invalid) return this.formSaisieEc.markAllAsTouched();
    const { elementConstitutifId } = this.formSaisieEc.getRawValue();
    this.saisieElementConstitutifId.set(elementConstitutifId);
    this.chargerGrilleSaisie();
  }

  changerEcSaisie(): void {
    this.saisieElementConstitutifId.set(null);
    this.lignesSaisie.clear();
  }

  private chargerGrilleSaisie(): void {
    const classe = this.saisieClasse();
    const semestreId = this.saisieSemestreId();
    const ecId = this.saisieElementConstitutifId();
    if (!classe || !semestreId || !ecId) return;
    this.chargementGrilleSaisie.set(true);
    this.evaluationsService.notesClasse(classe.id, semestreId, ecId).subscribe({
      next: (lignes) => {
        this.remplirGrilleSaisie(lignes);
        this.chargementGrilleSaisie.set(false);
      },
      error: () => this.chargementGrilleSaisie.set(false),
    });
  }

  /** Met à jour les lignes existantes en place (patchValue) plutôt que de les détruire et
   * recréer (clear + push) : chaque ligne reste liée au même FormGroup, exactement à l'index
   * où le template l'attend ([formGroupName]="i" sous un @for en "track $index") - sinon,
   * après un enregistrement ou un import, Angular ne réassocie pas forcément cette directive
   * au nouveau FormGroup à la même position et la grille peut rester visuellement figée sur
   * les anciennes valeurs alors que les données serveur sont bien à jour. */
  private remplirGrilleSaisie(lignes: LigneNoteClasseResponse[]): void {
    const tableau = this.lignesSaisie;
    while (tableau.length > lignes.length) tableau.removeAt(tableau.length - 1);
    lignes.forEach((ligne, i) => {
      if (i < tableau.length) {
        tableau.at(i).patchValue({
          etudiantId: ligne.etudiantId,
          nomComplet: ligne.nomComplet,
          matricule: ligne.matricule,
          cc: ligne.cc,
          examen: ligne.examen,
          rattrapage: ligne.rattrapage,
          presence: ligne.presence,
        });
      } else {
        tableau.push(this.creerLigneSaisie(ligne));
      }
    });
  }

  enregistrerGrilleSaisie(): void {
    const classe = this.saisieClasse();
    const semestreId = this.saisieSemestreId();
    const ecId = this.saisieElementConstitutifId();
    if (!classe || !semestreId || !ecId || !this.lignesSaisie.length) return;
    const lignes: SaisieNoteEtudiantRequest[] = this.lignesSaisie.controls.map((ligne) => {
      const v = ligne.getRawValue();
      return {
        etudiantId: v.etudiantId,
        cc: v.cc ?? undefined,
        examen: v.examen ?? undefined,
        rattrapage: v.rattrapage ?? undefined,
        presence: v.presence,
      };
    });
    this.enregistrementGrilleSaisie.set(true);
    this.evaluationsService.saisirNotesClasse({ classeId: classe.id, semestreId, elementConstitutifId: ecId, lignes }).subscribe({
      next: (resultat) => {
        this.remplirGrilleSaisie(resultat);
        this.enregistrementGrilleSaisie.set(false);
        this.snackBar.open('Notes enregistrées', 'OK', { duration: 3000 });
      },
      error: () => {
        this.enregistrementGrilleSaisie.set(false);
        this.snackBar.open("L'enregistrement a échoué, réessayez.", 'OK', { duration: 4000 });
      },
    });
  }

  telechargerModeleNotes(): void {
    const classe = this.saisieClasse();
    const semestreId = this.saisieSemestreId();
    const ecId = this.saisieElementConstitutifId();
    if (!classe || !semestreId || !ecId) return;
    this.evaluationsService.telechargerModeleNotes(classe.id, semestreId, ecId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = 'notes.xlsx';
        lien.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.snackBar.open('Impossible de générer le fichier', 'OK', { duration: 3000 }),
    });
  }

  /** Après lecture, réinitialise la valeur du champ fichier - sinon réimporter le même
   * fichier (après correction) ne redéclenche pas l'événement "change". */
  importerNotes(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier) return;
    const classe = this.saisieClasse();
    const semestreId = this.saisieSemestreId();
    const ecId = this.saisieElementConstitutifId();
    if (!classe || !semestreId || !ecId) return;
    this.importEnCoursSaisie.set(true);
    this.evaluationsService.importerNotesClasse(classe.id, semestreId, ecId, fichier).subscribe({
      next: (resultat) => {
        this.remplirGrilleSaisie(resultat.lignes);
        this.importEnCoursSaisie.set(false);
        this.snackBar.open(
          resultat.matriculesIgnores.length
            ? `Import terminé - matricules non reconnus : ${resultat.matriculesIgnores.join(', ')}`
            : 'Notes importées',
          'OK',
          { duration: resultat.matriculesIgnores.length ? 6000 : 3000 },
        );
      },
      error: () => {
        this.importEnCoursSaisie.set(false);
        this.snackBar.open("L'import a échoué, vérifiez le fichier.", 'OK', { duration: 4000 });
      },
    });
  }

  ouvrirEditionMatiere(matiere: MatiereResponse, ueIntitule: string): void {
    const bulletin = this.bulletinCourant();
    if (!bulletin) return;
    const ref = this.dialog.open<MatiereFormDialog, MatiereFormDialogData, BulletinDetailResponse>(MatiereFormDialog, {
      width: '620px',
      maxWidth: '95vw',
      data: { bulletinId: bulletin.bulletin.id, matiere, ueIntitule },
    });
    ref.afterClosed().subscribe((detail) => {
      if (!detail) return;
      this.bulletinCourant.set(detail);
      this.snackBar.open('Matière enregistrée', 'OK', { duration: 2500 });
    });
  }

  effacerMatiere(matiere: MatiereResponse): void {
    const bulletin = this.bulletinCourant();
    if (!bulletin) return;
    if (matiere.cc === null && matiere.examen === null && matiere.rattrapage === null) return;
    if (!confirm(`Effacer la note de ${matiere.intitule} ?`)) return;
    this.evaluationsService.effacerMatiere(bulletin.bulletin.id, matiere.elementConstitutifId).subscribe({
      next: (detail) => {
        this.bulletinCourant.set(detail);
        this.snackBar.open('Note effacée', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open("La suppression a échoué, réessayez.", 'OK', { duration: 4000 }),
    });
  }

  ouvrirAppreciation(): void {
    const bulletin = this.bulletinCourant();
    if (!bulletin) return;
    this.formAppreciation.reset({ appreciationConseilClasse: bulletin.bulletin.appreciationConseilClasse ?? '' });
    this.panneauAppreciation.set(true);
  }

  soumettreAppreciation(): void {
    const bulletin = this.bulletinCourant();
    if (!bulletin) return;
    const { appreciationConseilClasse } = this.formAppreciation.getRawValue();
    this.evaluationsService.modifierAppreciation(bulletin.bulletin.id, appreciationConseilClasse).subscribe((detail) => {
      this.bulletinCourant.set(detail);
      this.panneauAppreciation.set(false);
      this.snackBar.open('Appréciation enregistrée', 'OK', { duration: 2500 });
    });
  }

  imprimerBulletin(): void {
    window.print();
  }
}
