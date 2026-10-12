import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { DocumentsService } from '../../core/services/documents.service';
import { InscriptionsService } from '../../core/services/inscriptions.service';
import { DocumentGenere, TYPES_DOCUMENT, TemplateDocument } from '../../core/models/documents.models';
import { Etudiant } from '../../core/models/inscriptions.models';
import { ApiErrorResponse } from '../../core/models/error.models';

@Component({
  selector: 'app-documents',
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
    DatePipe,
  ],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export class DocumentsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly documentsService = inject(DocumentsService);
  private readonly inscriptionsService = inject(InscriptionsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly typesDocument = TYPES_DOCUMENT;
  readonly templates = signal<TemplateDocument[]>([]);
  readonly etudiants = signal<Etudiant[]>([]);
  readonly documentsGeneres = signal<DocumentGenere[]>([]);
  readonly etudiantSelectionne = signal('');
  readonly chargement = signal(true);
  readonly panneauTemplate = signal(false);
  readonly editionTemplateId = signal<string | null>(null);

  readonly formTemplate = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control(TYPES_DOCUMENT[0], Validators.required),
    enTete: [''],
    sectionIntroduction: [''],
    sectionConclusion: [''],
  });

  readonly formGeneration = this.fb.nonNullable.group({
    etudiantId: ['', Validators.required],
    type: this.fb.nonNullable.control(TYPES_DOCUMENT[0], Validators.required),
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    forkJoin({
      templates: this.documentsService.listerTemplates(),
      etudiants: this.inscriptionsService.listerEtudiants(),
    }).subscribe({
      next: (r) => {
        this.templates.set(r.templates);
        this.etudiants.set(r.etudiants);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirNouveauTemplate(): void {
    this.editionTemplateId.set(null);
    this.formTemplate.reset({ type: TYPES_DOCUMENT[0] });
    this.panneauTemplate.set(true);
  }

  editerTemplate(template: TemplateDocument): void {
    this.editionTemplateId.set(template.id);
    this.formTemplate.reset({
      type: template.type,
      enTete: template.enTete ?? '',
      sectionIntroduction: template.sectionIntroduction ?? '',
      sectionConclusion: template.sectionConclusion ?? '',
    });
    this.panneauTemplate.set(true);
  }

  fermerPanneauTemplate(): void {
    this.panneauTemplate.set(false);
    this.editionTemplateId.set(null);
  }

  soumettreTemplate(): void {
    if (this.formTemplate.invalid) return this.formTemplate.markAllAsTouched();
    this.documentsService.enregistrerTemplate(this.formTemplate.getRawValue()).subscribe(() => {
      this.formTemplate.reset({ type: TYPES_DOCUMENT[0] });
      this.editionTemplateId.set(null);
      this.panneauTemplate.set(false);
      this.snackBar.open('Template enregistré', 'OK', { duration: 2500 });
      this.charger();
    });
  }

  supprimerTemplate(template: TemplateDocument): void {
    if (!confirm(`Supprimer le template « ${template.type} » ? Cette action est irréversible.`)) return;
    this.documentsService.supprimerTemplate(template.id).subscribe({
      next: () => {
        this.snackBar.open('Template supprimé', 'OK', { duration: 2500 });
        this.charger();
      },
      error: (error: unknown) => {
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.snackBar.open(body?.message ?? 'La suppression a échoué.', 'OK', { duration: 4000 });
      },
    });
  }

  chargerDocuments(etudiantId: string): void {
    this.etudiantSelectionne.set(etudiantId);
    if (!etudiantId) {
      this.documentsGeneres.set([]);
      return;
    }
    this.documentsService.listerParEtudiant(etudiantId).subscribe((docs) => this.documentsGeneres.set(docs));
  }

  genererDocument(): void {
    if (this.formGeneration.invalid) return this.formGeneration.markAllAsTouched();
    this.documentsService.generer(this.formGeneration.getRawValue()).subscribe({
      next: (doc) => {
        this.snackBar.open(`Document ${doc.numero} généré`, 'OK', { duration: 3000 });
        this.chargerDocuments(this.formGeneration.getRawValue().etudiantId);
      },
      error: (error: unknown) => {
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.snackBar.open(body?.message ?? 'La génération du document a échoué.', 'OK', { duration: 4000 });
      },
    });
  }

  supprimerDocumentGenere(document: DocumentGenere): void {
    if (!confirm(`Supprimer le document « ${document.numero} » ?`)) return;
    this.documentsService.supprimerDocumentGenere(document.id).subscribe({
      next: () => {
        this.snackBar.open('Document supprimé', 'OK', { duration: 2500 });
        this.chargerDocuments(this.etudiantSelectionne());
      },
      error: (error: unknown) => {
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.snackBar.open(body?.message ?? 'La suppression a échoué.', 'OK', { duration: 4000 });
      },
    });
  }

  voirPdf(documentGenereId: string): void {
    this.documentsService.telechargerPdf(documentGenereId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.snackBar.open('Impossible de générer le PDF', 'OK', { duration: 3000 }),
    });
  }
}
