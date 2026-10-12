import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal, viewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BadgeageService } from '../../core/services/badgeage.service';
import { BadgeageEtudiantResponse } from '../../core/models/badgeage.models';
import { ApiErrorResponse } from '../../core/models/error.models';

@Component({
  selector: 'app-badgeage',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './badgeage.html',
  styleUrl: './badgeage.scss',
})
export class BadgeagePage implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly badgeageService = inject(BadgeageService);

  private readonly champNumeroCarte = viewChild<ElementRef<HTMLInputElement>>('champNumeroCarte');

  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly dernierBadge = signal<BadgeageEtudiantResponse | null>(null);
  /** Historique de la session au poste - pas rechargé au rafraîchissement, uniquement pour
   * suivre les derniers passages pendant que l'écran reste ouvert au poste d'entrée. */
  readonly historique = signal<BadgeageEtudiantResponse[]>([]);

  readonly formBadgeage = this.fb.nonNullable.group({
    numeroCarte: ['', Validators.required],
    poste: [''],
  });

  ngAfterViewInit(): void {
    this.champNumeroCarte()?.nativeElement.focus();
  }

  soumettre(): void {
    if (this.formBadgeage.invalid) return this.formBadgeage.markAllAsTouched();
    this.enCours.set(true);
    this.erreur.set(null);
    const v = this.formBadgeage.getRawValue();
    this.badgeageService.badger({ numeroCarte: v.numeroCarte, poste: v.poste || undefined }).subscribe({
      next: (resultat) => {
        this.enCours.set(false);
        this.dernierBadge.set(resultat);
        this.historique.update((liste) => [resultat, ...liste]);
        this.formBadgeage.controls.numeroCarte.reset('');
        this.champNumeroCarte()?.nativeElement.focus();
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        this.dernierBadge.set(null);
        const body = error instanceof HttpErrorResponse ? (error.error as ApiErrorResponse | undefined) : undefined;
        this.erreur.set(body?.message ?? 'Carte introuvable');
        this.formBadgeage.controls.numeroCarte.reset('');
        this.champNumeroCarte()?.nativeElement.focus();
      },
    });
  }
}
