import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ParametrageAcademiqueService } from '../../core/services/parametrage-academique.service';
import { ParcoursService } from '../../core/services/parcours.service';
import { AnneeAcademique, FiliereAcademique, Niveau, Semestre } from '../../core/models/parametrage.models';
import { Classe, ElementConstitutif, TYPES_UNITE_ENSEIGNEMENT, UniteEnseignement } from '../../core/models/parcours.models';
import { ClasseFormDialog, ClasseFormDialogData } from './classe-form-dialog/classe-form-dialog';
import { UniteEnseignementFormDialog, UniteEnseignementFormDialogData } from './unite-enseignement-form-dialog/unite-enseignement-form-dialog';
import {
  ElementConstitutifFormDialog,
  ElementConstitutifFormDialogData,
} from './element-constitutif-form-dialog/element-constitutif-form-dialog';

@Component({
  selector: 'app-parcours',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatTooltipModule],
  templateUrl: './parcours.html',
  styleUrl: './parcours.scss',
})
export class ParcoursPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly parcoursService = inject(ParcoursService);
  private readonly academique = inject(ParametrageAcademiqueService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly annees = signal<AnneeAcademique[]>([]);
  readonly semestres = signal<Semestre[]>([]);
  readonly filieres = signal<FiliereAcademique[]>([]);
  readonly niveaux = signal<Niveau[]>([]);
  readonly classes = signal<Classe[]>([]);
  readonly unitesEnseignement = signal<UniteEnseignement[]>([]);
  readonly chargement = signal(true);
  readonly typesUe = TYPES_UNITE_ENSEIGNEMENT;

  typeUeLabel(type: UniteEnseignement['type']): string {
    return this.typesUe.find((t) => t.type === type)?.label ?? type;
  }

  /** Année choisie via "Voir les classes" - distincte de la sélection du <mat-select> pour
   * ne filtrer qu'au clic, comme sur la plateforme de référence (cf. Cours > Affectations). */
  readonly anneeAfficheeClasses = signal<string | null>(null);
  readonly classesDeLAnnee = computed(() => this.classes().filter((c) => c.anneeAcademiqueId === this.anneeAfficheeClasses()));
  readonly anneeClassesSelectionnee = computed(() => this.annees().find((a) => a.id === this.anneeAfficheeClasses()) ?? null);
  readonly formAnneeClasses = this.fb.nonNullable.group({ anneeAcademiqueId: [''] });

  /** Même principe pour les unités d'enseignement. */
  readonly anneeAfficheeUe = signal<string | null>(null);
  readonly ueDeLAnnee = computed(() => this.unitesEnseignement().filter((u) => u.anneeAcademiqueId === this.anneeAfficheeUe()));
  readonly formAnneeUe = this.fb.nonNullable.group({ anneeAcademiqueId: [''] });

  /** Étape 3 de la section "Unités d'enseignement" - null = liste des UE de l'année, sinon
   * détail (éléments constitutifs) de l'UE choisie. Une seule de ces deux vues est affichée. */
  readonly ueSelectionnee = signal<UniteEnseignement | null>(null);
  readonly elementsDeLUe = signal<ElementConstitutif[]>([]);
  readonly chargementElements = signal(false);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    forkJoin({
      annees: this.academique.listerAnnees(),
      semestres: this.academique.listerSemestres(),
      filieres: this.academique.listerFilieres(),
      niveaux: this.academique.listerNiveaux(),
      classes: this.parcoursService.listerClasses(),
      ue: this.parcoursService.listerUnitesEnseignement(),
    }).subscribe({
      next: (r) => {
        this.annees.set(r.annees);
        this.semestres.set(r.semestres);
        this.filieres.set(r.filieres);
        this.niveaux.set(r.niveaux);
        this.classes.set(r.classes);
        this.unitesEnseignement.set(r.ue);
        this.chargement.set(false);
        // L'UE affichée en détail doit rester en phase avec la liste rechargée.
        const ue = this.ueSelectionnee();
        if (ue) this.ueSelectionnee.set(r.ue.find((u) => u.id === ue.id) ?? null);
      },
      error: () => this.chargement.set(false),
    });
  }

  // ----- Classes -----

  voirClasses(): void {
    this.anneeAfficheeClasses.set(this.formAnneeClasses.controls.anneeAcademiqueId.value || null);
  }

  retourAnneeClasses(): void {
    this.anneeAfficheeClasses.set(null);
  }

  ouvrirAjoutClasse(): void {
    this.ouvrirFormulaireClasse(undefined);
  }

  ouvrirEditionClasse(classe: Classe): void {
    this.ouvrirFormulaireClasse(classe);
  }

  private ouvrirFormulaireClasse(classe: Classe | undefined): void {
    const ref = this.dialog.open<ClasseFormDialog, ClasseFormDialogData, Classe>(ClasseFormDialog, {
      width: '680px',
      maxWidth: '95vw',
      data: {
        filieres: this.filieres(),
        niveaux: this.niveaux(),
        annees: this.annees(),
        classe,
        anneeAcademiqueIdParDefaut: this.anneeAfficheeClasses() ?? undefined,
      },
    });
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(classe ? 'Classe modifiée' : 'Classe ajoutée', 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerClasse(id: string): void {
    if (!confirm('Supprimer cette classe ?')) return;
    this.parcoursService.supprimerClasse(id).subscribe({
      next: () => {
        this.snackBar.open('Classe supprimée', 'OK', { duration: 3000 });
        this.charger();
      },
      error: () =>
        this.snackBar.open('Suppression impossible : des inscriptions ou affectations sont liées à cette classe.', 'OK', {
          duration: 4000,
        }),
    });
  }

  // ----- Unités d'enseignement -----

  voirUe(): void {
    this.ueSelectionnee.set(null);
    this.anneeAfficheeUe.set(this.formAnneeUe.controls.anneeAcademiqueId.value || null);
  }

  retourAnneeUe(): void {
    this.anneeAfficheeUe.set(null);
  }

  ouvrirAjoutUe(): void {
    this.ouvrirFormulaireUe(undefined);
  }

  ouvrirEditionUe(ue: UniteEnseignement): void {
    this.ouvrirFormulaireUe(ue);
  }

  private ouvrirFormulaireUe(ue: UniteEnseignement | undefined): void {
    const ref = this.dialog.open<UniteEnseignementFormDialog, UniteEnseignementFormDialogData, UniteEnseignement>(
      UniteEnseignementFormDialog,
      {
        width: '680px',
        maxWidth: '95vw',
        data: {
          semestres: this.semestres(),
          annees: this.annees(),
          anneeAcademiqueIdParDefaut: ue?.anneeAcademiqueId ?? this.anneeAfficheeUe() ?? undefined,
          ue,
        },
      },
    );
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open(ue ? "Unité d'enseignement modifiée" : "Unité d'enseignement ajoutée", 'OK', { duration: 3000 });
      this.charger();
    });
  }

  supprimerUniteEnseignement(ue: UniteEnseignement): void {
    if (!confirm(`Supprimer l'unité d'enseignement "${ue.code} — ${ue.intitule}" ?`)) return;
    this.parcoursService.supprimerUniteEnseignement(ue.id).subscribe({
      next: () => {
        this.snackBar.open("Unité d'enseignement supprimée", 'OK', { duration: 3000 });
        this.charger();
      },
      error: () =>
        this.snackBar.open(
          "Suppression impossible : des éléments constitutifs sont liés à cette unité d'enseignement.",
          'OK',
          { duration: 4000 },
        ),
    });
  }

  selectionnerUe(ue: UniteEnseignement): void {
    this.ueSelectionnee.set(ue);
    this.chargementElements.set(true);
    this.parcoursService.listerElementsConstitutifs(ue.id).subscribe((elements) => {
      this.elementsDeLUe.set(elements);
      this.chargementElements.set(false);
    });
  }

  retourUnitesEnseignement(): void {
    this.ueSelectionnee.set(null);
    this.elementsDeLUe.set([]);
  }

  ouvrirAjoutEc(): void {
    const ue = this.ueSelectionnee();
    if (!ue) return;
    const ref = this.dialog.open<ElementConstitutifFormDialog, ElementConstitutifFormDialogData, ElementConstitutif>(
      ElementConstitutifFormDialog,
      { width: '620px', maxWidth: '95vw', data: { uniteEnseignement: ue } },
    );
    ref.afterClosed().subscribe((resultat) => {
      if (!resultat) return;
      this.snackBar.open('Élément constitutif ajouté', 'OK', { duration: 3000 });
      this.parcoursService.listerElementsConstitutifs(ue.id).subscribe((elements) => this.elementsDeLUe.set(elements));
      this.charger();
    });
  }
}
