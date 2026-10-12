import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ApiErrorResponse } from '../../../core/models/error.models';

type ModeConnexion = 'ETABLISSEMENT' | 'SUPER_ADMIN';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<ModeConnexion>('ETABLISSEMENT');
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  /** La connexion Super Admin n'est plus proposée sur l'écran normal - seule une URL
   * connaissant ce paramètre (ex. /login?AdmScolaire) fait apparaître le bascule. */
  readonly superAdminAccessible = signal(this.route.snapshot.queryParamMap.has('AdmScolaire'));

  readonly form = this.fb.nonNullable.group({
    codeEtablissement: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  basculerMode(mode: ModeConnexion): void {
    this.mode.set(mode);
    this.erreur.set(null);
    const codeControl = this.form.controls.codeEtablissement;
    if (mode === 'ETABLISSEMENT') {
      codeControl.addValidators(Validators.required);
    } else {
      codeControl.clearValidators();
    }
    codeControl.updateValueAndValidity();
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enCours.set(true);
    this.erreur.set(null);
    const { codeEtablissement, email, password } = this.form.getRawValue();

    const connexion$ =
      this.mode() === 'SUPER_ADMIN'
        ? this.authService.loginSuperAdmin({ email, password })
        : this.authService.loginTenant({ codeEtablissement, email, password });

    connexion$.subscribe({
      next: (response) => {
        this.enCours.set(false);
        this.router.navigate([response.type === 'SUPER_ADMIN' ? '/super-admin' : '/admin']);
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
      if (error.status === 401) {
        return 'Identifiants invalides';
      }
    }
    return "Une erreur est survenue, reessayez.";
  }
}
