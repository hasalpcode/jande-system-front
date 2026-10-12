import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InscriptionsService } from '../../../core/services/inscriptions.service';
import { CIVILITES, FormulaireAdmission, PERIODES_DISPONIBILITE, SEXES, SITUATIONS_MATRIMONIALES } from '../../../core/models/inscriptions.models';
import { Nationalite } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface CandidatFormDialogData {
  nationalites: Nationalite[];
}

/** Au-delà, le data URI base64 (stocké tel quel en base) devient déraisonnable. */
const TAILLE_PHOTO_MAX_OCTETS = 500 * 1024;

@Component({
  selector: 'app-candidat-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './candidat-form-dialog.html',
  styleUrl: './candidat-form-dialog.scss',
})
export class CandidatFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly inscriptionsService = inject(InscriptionsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<CandidatFormDialog, FormulaireAdmission>);
  readonly data = inject<CandidatFormDialogData>(MAT_DIALOG_DATA);

  readonly civilites = CIVILITES;
  readonly sexes = SEXES;
  readonly situationsMatrimoniales = SITUATIONS_MATRIMONIALES;
  readonly periodesDisponibilite = PERIODES_DISPONIBILITE;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly photo = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    // Etat civil
    numeroIdentite: [''],
    civilite: [''],
    sexe: [''],
    situationMatrimoniale: [''],
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    dateNaissance: [''],
    lieuNaissance: [''],
    nationaliteCode: [''],
    // Contacts
    adresse: [''],
    contact: [''],
    telephone2: [''],
    reseauSocial: [''],
    siteWeb: [''],
    email: [''],
    // Info professionnelles
    proSociete: [''],
    proTelephoneBureau: [''],
    proProfession: [''],
    proFonction: [''],
    proAdresseSociete: [''],
    // Info cursus
    cursusDernierEtablissement: [''],
    cursusNiveauEtude: [''],
    cursusAnnee: [''],
    cursusDiplomeTitre: [''],
    // Autres infos
    maladies: [''],
    tuteurs: this.fb.nonNullable.array([this.creerLigneTuteur()]),
    dispoPeriode: [''],
    dispoHeureDebut: [''],
    dispoHeureFin: [''],
    fraisPreinscription: [''],
    observation: [''],
  });

  get tuteursFormArray() {
    return this.form.controls.tuteurs;
  }

  private creerLigneTuteur() {
    return this.fb.nonNullable.group({ nom: [''], telephone: [''] });
  }

  ajouterTuteur(): void {
    this.tuteursFormArray.push(this.creerLigneTuteur());
  }

  retirerTuteur(index: number): void {
    this.tuteursFormArray.removeAt(index);
  }

  selectionnerPhoto(event: Event): void {
    const fichier = (event.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    if (fichier.size > TAILLE_PHOTO_MAX_OCTETS) {
      this.snackBar.open('Image trop volumineuse (500 Ko max), choisissez-en une plus légère.', 'OK', { duration: 4000 });
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => this.photo.set(lecteur.result as string);
    lecteur.readAsDataURL(fichier);
  }

  retirerPhoto(): void {
    this.photo.set(null);
  }

  annuler(): void {
    this.dialogRef.close();
  }

  soumettre(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    this.inscriptionsService
      .soumettreFormulaire({
        numeroIdentite: v.numeroIdentite || undefined,
        civilite: (v.civilite || undefined) as never,
        sexe: (v.sexe || undefined) as never,
        photo: this.photo() || undefined,
        situationMatrimoniale: (v.situationMatrimoniale || undefined) as never,
        nom: v.nom,
        prenom: v.prenom,
        dateNaissance: v.dateNaissance || undefined,
        lieuNaissance: v.lieuNaissance || undefined,
        nationaliteCode: v.nationaliteCode || undefined,
        adresse: v.adresse || undefined,
        contact: v.contact || undefined,
        telephone2: v.telephone2 || undefined,
        reseauSocial: v.reseauSocial || undefined,
        siteWeb: v.siteWeb || undefined,
        email: v.email || undefined,
        infosProfessionnelles: {
          societe: v.proSociete || undefined,
          telephoneBureau: v.proTelephoneBureau || undefined,
          profession: v.proProfession || undefined,
          fonction: v.proFonction || undefined,
          adresseSociete: v.proAdresseSociete || undefined,
        },
        cursusAnterieur: {
          dernierEtablissement: v.cursusDernierEtablissement || undefined,
          niveauEtude: v.cursusNiveauEtude || undefined,
          annee: v.cursusAnnee || undefined,
          diplomeTitre: v.cursusDiplomeTitre || undefined,
        },
        maladies: v.maladies || undefined,
        tuteurs: v.tuteurs.filter((t) => t.nom).map((t) => ({ nom: t.nom, telephone: t.telephone })),
        disponibilite: {
          periode: (v.dispoPeriode || undefined) as never,
          heureDebut: v.dispoHeureDebut || undefined,
          heureFin: v.dispoHeureFin || undefined,
        },
        fraisPreinscription: v.fraisPreinscription || undefined,
        observation: v.observation || undefined,
      })
      .subscribe({
        next: (formulaire) => {
          // Admission automatique : plus d'étape de validation manuelle du formulaire.
          this.inscriptionsService.admettre(formulaire.id).subscribe({
            next: (formulaireAdmis) => {
              this.enCours.set(false);
              this.dialogRef.close(formulaireAdmis);
            },
            error: (error: unknown) => {
              this.enCours.set(false);
              const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
              this.erreur.set(body?.message ?? "L'admission automatique a échoué, réessayez.");
            },
          });
        },
        error: (error: unknown) => {
          this.enCours.set(false);
          const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
          this.erreur.set(body?.message ?? "La soumission a échoué, réessayez.");
        },
      });
  }
}
