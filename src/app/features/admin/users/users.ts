import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../core/services/auth.service';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { Utilisateur } from '../../../core/models/utilisateur.models';
import { CreateUserDialog, CreateUserDialogData } from '../create-user-dialog/create-user-dialog';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private readonly utilisateurService = inject(UtilisateurService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly authService = inject(AuthService);

  readonly utilisateurs = signal<Utilisateur[]>([]);
  readonly chargement = signal(true);
  readonly colonnes = ['nom', 'email', 'telephone', 'roles', 'actif'];

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.utilisateurService.lister().subscribe({
      next: (utilisateurs) => {
        this.utilisateurs.set(utilisateurs);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  ouvrirCreation(): void {
    const ref = this.dialog.open(CreateUserDialog, { width: '520px' });
    ref.afterClosed().subscribe((utilisateur: Utilisateur | undefined) => {
      if (utilisateur) {
        this.snackBar.open(`${utilisateur.prenom} ${utilisateur.nom} créé`, 'OK', { duration: 4000 });
        this.charger();
      }
    });
  }

  ouvrirEdition(utilisateur: Utilisateur): void {
    const ref = this.dialog.open<CreateUserDialog, CreateUserDialogData, Utilisateur>(CreateUserDialog, {
      width: '520px',
      data: { utilisateur },
    });
    ref.afterClosed().subscribe((maj) => {
      if (maj) {
        this.snackBar.open(`${maj.prenom} ${maj.nom} mis à jour`, 'OK', { duration: 4000 });
        this.charger();
      }
    });
  }
}
