import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UtilisateurService } from '../../../core/services/utilisateur.service';
import { PERMISSIONS, Permission, ROLE_TYPES, RoleType, SOUS_PERMISSIONS, Utilisateur } from '../../../core/models/utilisateur.models';
import { ApiErrorResponse } from '../../../core/models/error.models';

export interface CreateUserDialogData {
  utilisateur?: Utilisateur;
}

/** Sert a la fois la creation et l'edition : si data.utilisateur est fourni,
 * le formulaire se pre-remplit et soumettre() appelle PUT au lieu de POST. */
@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './create-user-dialog.html',
  styleUrl: './create-user-dialog.scss',
})
export class CreateUserDialog {
  private readonly fb = inject(FormBuilder);
  private readonly utilisateurService = inject(UtilisateurService);
  private readonly dialogRef = inject(MatDialogRef<CreateUserDialog>);
  private readonly data = inject<CreateUserDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly rolesDisponibles = ROLE_TYPES;
  readonly permissionsDisponibles = PERMISSIONS;
  readonly sousPermissions = SOUS_PERMISSIONS;
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly modeEdition = !!this.data.utilisateur;
  /** Informatif seulement - le rattachement lui-même se déduit automatiquement de l'email
   * côté serveur (voir AdminUserController), rien à choisir ici. */
  readonly professeurNomComplet = this.data.utilisateur?.professeurNomComplet ?? null;

  readonly form = this.fb.nonNullable.group({
    nom: [this.data.utilisateur?.nom ?? '', Validators.required],
    prenom: [this.data.utilisateur?.prenom ?? '', Validators.required],
    email: [this.data.utilisateur?.email ?? '', [Validators.required, Validators.email]],
    telephone: [this.data.utilisateur?.telephone ?? ''],
    motDePasse: ['', this.modeEdition ? [] : [Validators.required, Validators.minLength(8)]],
    roles: this.fb.nonNullable.control<RoleType[]>(this.data.utilisateur?.roles ?? [], Validators.required),
    permissions: this.fb.nonNullable.control<Permission[]>(this.data.utilisateur?.permissions ?? []),
    actif: [this.data.utilisateur?.actif ?? true],
  });

  /** Un module coché affiche ses sous-permissions (si le module en a) ; le décocher retire
   * aussi toutes ses sous-permissions déjà cochées - ça n'aurait pas de sens de garder une
   * action précise d'un module dont l'accès général vient d'être retiré. */
  moduleCoche(module: Permission): boolean {
    return this.form.controls.permissions.value.includes(module);
  }

  basculerModule(module: Permission, coche: boolean): void {
    const actuelles = this.form.controls.permissions.value;
    if (coche) {
      this.form.controls.permissions.setValue([...actuelles, module]);
    } else {
      const sousCles = new Set((this.sousPermissions[module] ?? []).map((sp) => sp.value));
      this.form.controls.permissions.setValue(actuelles.filter((p) => p !== module && !sousCles.has(p)));
    }
  }

  sousPermissionCochee(permission: Permission): boolean {
    return this.form.controls.permissions.value.includes(permission);
  }

  basculerSousPermission(permission: Permission, coche: boolean): void {
    const actuelles = this.form.controls.permissions.value;
    this.form.controls.permissions.setValue(
      coche ? [...actuelles, permission] : actuelles.filter((p) => p !== permission),
    );
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
    const value = this.form.getRawValue();

    const requete = this.modeEdition
      ? this.utilisateurService.modifier(this.data.utilisateur!.id, {
          nom: value.nom,
          prenom: value.prenom,
          email: value.email,
          telephone: value.telephone,
          roles: value.roles,
          permissions: value.permissions,
          actif: value.actif,
        })
      : this.utilisateurService.creer({
          nom: value.nom,
          prenom: value.prenom,
          email: value.email,
          telephone: value.telephone,
          motDePasse: value.motDePasse,
          roles: value.roles,
          permissions: value.permissions,
        });

    requete.subscribe({
      next: (utilisateur: Utilisateur) => {
        this.enCours.set(false);
        this.dialogRef.close(utilisateur);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        this.erreur.set(this.messageErreur(error));
      },
    });
  }

  private messageErreur(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | undefined;
      if (body?.message) {
        return body.message;
      }
    }
    return this.modeEdition ? "La modification a échoué, réessayez." : "La création a échoué, réessayez.";
  }
}
