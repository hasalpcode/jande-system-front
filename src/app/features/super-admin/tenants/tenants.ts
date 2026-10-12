import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EtablissementService } from '../../../core/services/etablissement.service';
import { Etablissement } from '../../../core/models/etablissement.models';
import { CreateTenantDialog } from '../create-tenant-dialog/create-tenant-dialog';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './tenants.html',
  styleUrl: './tenants.scss',
})
export class Tenants implements OnInit {
  private readonly etablissementService = inject(EtablissementService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly etablissements = signal<Etablissement[]>([]);
  readonly chargement = signal(true);
  readonly colonnes = ['nom', 'code', 'type', 'adresse', 'actif'];

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.etablissementService.lister().subscribe({
      next: (etablissements) => {
        this.etablissements.set(etablissements);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirCreation(): void {
    const ref = this.dialog.open(CreateTenantDialog, { width: '460px' });
    ref.afterClosed().subscribe((etablissement: Etablissement | undefined) => {
      if (etablissement) {
        this.snackBar.open(`Établissement ${etablissement.code} créé`, 'OK', { duration: 4000 });
        this.charger();
      }
    });
  }

  basculerStatut(etablissement: Etablissement): void {
    this.etablissementService.changerStatut(etablissement.id, !etablissement.actif).subscribe({
      next: () => this.charger(),
      error: () =>
        this.snackBar.open("Le changement de statut a échoué", 'OK', { duration: 4000 }),
    });
  }
}
