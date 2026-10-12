import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EtablissementInfoService } from '../../../core/services/etablissement-info.service';
import { Etudiant } from '../../../core/models/inscriptions.models';
import { EtablissementInfo, Nationalite } from '../../../core/models/parametrage.models';

export interface EtudiantFicheDialogData {
  etudiant: Etudiant;
  nationalites: Nationalite[];
}

@Component({
  selector: 'app-etudiant-fiche-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './etudiant-fiche-dialog.html',
  styleUrl: './etudiant-fiche-dialog.scss',
})
export class EtudiantFicheDialog {
  private readonly dialogRef = inject(MatDialogRef<EtudiantFicheDialog>);
  private readonly etablissementService = inject(EtablissementInfoService);
  readonly data = inject<EtudiantFicheDialogData>(MAT_DIALOG_DATA);

  readonly etablissement = signal<EtablissementInfo | null>(null);

  readonly etudiant = this.data.etudiant;

  readonly nationaliteLibelle = computed(
    () => this.data.nationalites.find((n) => n.code === this.etudiant.nationaliteCode)?.libelle ?? this.etudiant.nationaliteCode,
  );

  readonly aCursusAnterieur = !!(
    this.etudiant.cursusAnterieur?.dernierEtablissement ||
    this.etudiant.cursusAnterieur?.niveauEtude ||
    this.etudiant.cursusAnterieur?.annee ||
    this.etudiant.cursusAnterieur?.diplomeTitre
  );

  readonly aInfosProfessionnelles = !!(
    this.etudiant.infosProfessionnelles?.societe ||
    this.etudiant.infosProfessionnelles?.telephoneBureau ||
    this.etudiant.infosProfessionnelles?.profession ||
    this.etudiant.infosProfessionnelles?.fonction ||
    this.etudiant.infosProfessionnelles?.adresseSociete
  );

  readonly aDisponibilite = !!(this.etudiant.disponibilite?.periode || this.etudiant.disponibilite?.heureDebut);

  constructor() {
    this.etablissementService.obtenir().subscribe({
      next: (e) => this.etablissement.set(e),
      error: () => this.etablissement.set(null),
    });
  }

  fermer(): void {
    this.dialogRef.close();
  }

  /** Imprime la fiche dans une fenêtre dédiée plutôt que la boîte de dialogue elle-même -
   * évite d'avoir à neutraliser au print tout ce qui l'entoure (overlay, reste de la page). */
  imprimer(): void {
    const fenetre = window.open('', '_blank', 'width=850,height=1000');
    if (!fenetre) return;
    fenetre.document.write(this.genererHtml());
    fenetre.document.close();
    fenetre.onload = () => {
      fenetre.focus();
      fenetre.print();
    };
  }

  /** Reproduit le format compact de la plateforme de référence : encart bordé par
   * section avec une étiquette bleue à cheval sur le bord, lignes "Label : valeur"
   * toujours affichées (même vides) plutôt que masquées, et bloc de signature en pied. */
  private genererHtml(): string {
    const e = this.etudiant;
    const etab = this.etablissement();
    const champ = (label: string, valeur: string | null | undefined) =>
      `<span class="champ"><strong>${this.echapper(label)} :</strong> ${valeur ? this.echapper(valeur) : ''}</span>`;
    const ligne = (champs: string[]) => `<div class="ligne">${champs.join('')}</div>`;
    const section = (titre: string, lignes: string[][]) =>
      `<div class="section"><span class="badge">${this.echapper(titre)}</span><div class="corps">${lignes.map(ligne).join('')}</div></div>`;

    const photoImpression = e.photo ? `<img src="${this.echapper(e.photo)}" alt="" class="photo-impression" />` : '';

    const sections = [
      section('Etat civil', [
        [champ('N° identité', e.numeroIdentite), champ('Matricule', e.matricule), champ('Civilité', e.civilite)],
        [champ('Nom', e.nom), champ('Prénom', e.prenom)],
        [champ('Sexe', e.sexe), champ('Né(e) le', e.dateNaissance), champ('à', e.lieuNaissance)],
        [champ('Situation matrimoniale', e.situationMatrimoniale), champ('Nationalité', this.nationaliteLibelle() ?? null)],
      ]).replace('<div class="corps">', `${photoImpression}<div class="corps">`),
      section('Contacts', [
        [champ('Adresse', e.adresse)],
        [champ('Téléphone', e.contact), champ('Téléphone 2', e.telephone2)],
        [champ('Email', e.email), champ('Site web', e.siteWeb)],
        [champ('Réseau social', e.reseauSocial)],
      ]),
      section('Info. professionnelles', [
        [champ('Société', e.infosProfessionnelles?.societe), champ('Téléphone bureau', e.infosProfessionnelles?.telephoneBureau)],
        [champ('Profession', e.infosProfessionnelles?.profession), champ('Fonction', e.infosProfessionnelles?.fonction)],
        [champ('Adresse société', e.infosProfessionnelles?.adresseSociete)],
      ]),
      section('Info. cursus', [
        [champ('Dernier établissement', e.cursusAnterieur?.dernierEtablissement)],
        [champ('Niveau étude', e.cursusAnterieur?.niveauEtude), champ('Année fréquentation', e.cursusAnterieur?.annee)],
        [champ('Diplôme', e.cursusAnterieur?.diplomeTitre)],
      ]),
      section('Autres infos', [
        [champ('Maladies', e.maladies)],
        [champ('Disponibilité', e.disponibilite?.periode), champ('Heure début', e.disponibilite?.heureDebut), champ('Heure fin', e.disponibilite?.heureFin)],
        [champ('Frais préinscript.', e.fraisPreinscription)],
        [champ('Autres informations', e.autresInfos)],
        [champ('Observations', e.observation)],
      ]),
    ].join('');

    const logo = etab?.logo ? `<img src="${this.echapper(etab.logo)}" alt="" class="logo-etab" />` : '';
    const dateDuJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

    return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Fiche étudiant — ${this.echapper(e.nom)} ${this.echapper(e.prenom)}</title>
      <style>
        @page { size: A4; margin: 1.6cm; }
        body { font-family: Helvetica, Arial, sans-serif; color: #1d2129; font-size: 10pt; }
        .entete { display: grid; grid-template-columns: 100px 1fr 100px; align-items: center; margin-bottom: 22px; }
        .logo-etab { height: 60px; max-width: 90px; object-fit: contain; }
        h1 { grid-column: 2; text-align: center; font-size: 17pt; text-decoration: underline; margin: 0; }
        .section { position: relative; border: 1px solid #9aa1ab; border-radius: 4px; margin: 18px 0 14px; padding: 12px 14px 8px; break-inside: avoid; }
        .badge { position: absolute; top: -11px; left: 10px; background: #1a237e; color: #fff; font-weight: bold; font-size: 9pt; padding: 3px 10px; border-radius: 3px; }
        .photo-impression { position: absolute; top: 10px; right: 10px; width: 64px; height: 64px; object-fit: cover; border-radius: 6px; border: 1px solid #9aa1ab; }
        .ligne { display: flex; flex-wrap: wrap; gap: 4px 28px; margin-bottom: 6px; }
        .ligne:last-child { margin-bottom: 0; }
        .champ strong { font-weight: 700; }
        .pied { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; font-size: 10pt; }
        .signature { text-decoration: underline; font-weight: 700; }
      </style>
    </head><body>
      <div class="entete">${logo}<h1>Fiche Etudiant</h1></div>
      ${sections}
      <div class="pied">
        <span>Fait le : ${dateDuJour}</span>
        <span class="signature">La direction :</span>
      </div>
    </body></html>`;
  }

  private echapper(valeur: string): string {
    return valeur.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
