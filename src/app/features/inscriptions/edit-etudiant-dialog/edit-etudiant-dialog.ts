import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InscriptionsService } from '../../../core/services/inscriptions.service';
import { CIVILITES, Etudiant, PERIODES_DISPONIBILITE, SEXES, SITUATIONS_MATRIMONIALES } from '../../../core/models/inscriptions.models';
import { Nationalite } from '../../../core/models/parametrage.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface EditEtudiantDialogData {
  etudiant: Etudiant;
  nationalites: Nationalite[];
}

/** Au-delà, le data URI base64 (stocké tel quel en base) devient déraisonnable. */
const TAILLE_PHOTO_MAX_OCTETS = 500 * 1024;

@Component({
  selector: 'app-edit-etudiant-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './edit-etudiant-dialog.html',
  styleUrl: './edit-etudiant-dialog.scss',
})
export class EditEtudiantDialog {
  private readonly fb = inject(FormBuilder);
  private readonly inscriptionsService = inject(InscriptionsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<EditEtudiantDialog>);
  readonly data = inject<EditEtudiantDialogData>(MAT_DIALOG_DATA);

  readonly civilites = CIVILITES;
  readonly sexes = SEXES;
  readonly situationsMatrimoniales = SITUATIONS_MATRIMONIALES;
  readonly periodesDisponibilite = PERIODES_DISPONIBILITE;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly photo = signal<string | null>(this.data.etudiant.photo);

  readonly form = this.fb.nonNullable.group({
    numeroIdentite: [this.data.etudiant.numeroIdentite ?? ''],
    nom: [this.data.etudiant.nom, Validators.required],
    prenom: [this.data.etudiant.prenom, Validators.required],
    dateNaissance: [this.data.etudiant.dateNaissance ?? ''],
    civilite: [this.data.etudiant.civilite ?? ''],
    sexe: [this.data.etudiant.sexe ?? ''],
    situationMatrimoniale: [this.data.etudiant.situationMatrimoniale ?? ''],
    lieuNaissance: [this.data.etudiant.lieuNaissance ?? ''],
    contact: [this.data.etudiant.contact ?? ''],
    telephone2: [this.data.etudiant.telephone2 ?? ''],
    nationaliteCode: [this.data.etudiant.nationaliteCode ?? ''],
    adresse: [this.data.etudiant.adresse ?? ''],
    reseauSocial: [this.data.etudiant.reseauSocial ?? ''],
    siteWeb: [this.data.etudiant.siteWeb ?? ''],
    email: [this.data.etudiant.email ?? ''],
    proSociete: [this.data.etudiant.infosProfessionnelles?.societe ?? ''],
    proTelephoneBureau: [this.data.etudiant.infosProfessionnelles?.telephoneBureau ?? ''],
    proProfession: [this.data.etudiant.infosProfessionnelles?.profession ?? ''],
    proFonction: [this.data.etudiant.infosProfessionnelles?.fonction ?? ''],
    proAdresseSociete: [this.data.etudiant.infosProfessionnelles?.adresseSociete ?? ''],
    autresInfos: [this.data.etudiant.autresInfos ?? ''],
    maladies: [this.data.etudiant.maladies ?? ''],
    dispoPeriode: [this.data.etudiant.disponibilite?.periode ?? ''],
    dispoHeureDebut: [this.data.etudiant.disponibilite?.heureDebut ?? ''],
    dispoHeureFin: [this.data.etudiant.disponibilite?.heureFin ?? ''],
    fraisPreinscription: [this.data.etudiant.fraisPreinscription ?? ''],
    observation: [this.data.etudiant.observation ?? ''],
  });

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();

    this.inscriptionsService
      .modifierEtudiant(this.data.etudiant.id, {
        numeroIdentite: v.numeroIdentite || undefined,
        nom: v.nom,
        prenom: v.prenom,
        dateNaissance: v.dateNaissance || undefined,
        civilite: (v.civilite || undefined) as never,
        sexe: (v.sexe || undefined) as never,
        photo: this.photo() || undefined,
        situationMatrimoniale: (v.situationMatrimoniale || undefined) as never,
        lieuNaissance: v.lieuNaissance || undefined,
        contact: v.contact || undefined,
        telephone2: v.telephone2 || undefined,
        nationaliteCode: v.nationaliteCode || undefined,
        adresse: v.adresse || undefined,
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
        autresInfos: v.autresInfos || undefined,
        maladies: v.maladies || undefined,
        disponibilite: {
          periode: (v.dispoPeriode || undefined) as never,
          heureDebut: v.dispoHeureDebut || undefined,
          heureFin: v.dispoHeureFin || undefined,
        },
        fraisPreinscription: v.fraisPreinscription || undefined,
        observation: v.observation || undefined,
      })
      .subscribe({
        next: (etudiant: Etudiant) => {
          this.enCours.set(false);
          this.dialogRef.close(etudiant);
        },
        error: (error: unknown) => {
          this.enCours.set(false);
          const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
          this.erreur.set(body?.message ?? 'La modification a échoué, réessayez.');
        },
      });
  }
}
