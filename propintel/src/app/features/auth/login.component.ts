import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <a routerLink="/" class="auth-logo"><img src="assets/logo_urbia.png" alt="UrbIA" /></a>
        <h1>Bienvenido de vuelta</h1>
        <p class="auth-subtitle">Accede para ver la información completa de cada inmueble</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <div class="form-field">
            <label>Nombre</label>
            <input type="text" formControlName="nombre" placeholder="Tu nombre" autocomplete="name" />
          </div>
          <div class="form-field">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="tu@email.com" autocomplete="email" />
          </div>

          <div *ngIf="errorMsg" class="form-error">{{ errorMsg }}</div>

          <button type="submit" class="btn-auth" [disabled]="form.invalid">
            Entrar
          </button>
        </form>

        <p class="auth-switch">
          ¿No tienes cuenta?
          <a [routerLink]="['/registro']" [queryParams]="returnUrlParam">Regístrate gratis</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      background: var(--bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .auth-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px 36px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    }
    .auth-logo {
      display: block;
      text-decoration: none;
      margin-bottom: 24px;
    }
    .auth-logo img { height: 40px; width: auto; object-fit: contain; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .auth-subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 28px; }
    .auth-form { display: flex; flex-direction: column; gap: 16px; }
    .form-field { display: flex; flex-direction: column; gap: 6px; }
    .form-field label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .form-field input {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 11px 14px;
      font-size: 14px;
      color: var(--text-primary);
      font-family: 'DM Sans', sans-serif;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-field input:focus { border-color: var(--accent); }
    .form-error {
      background: rgba(229, 57, 53, 0.1);
      border: 1px solid rgba(229, 57, 53, 0.3);
      color: #e53935;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
    }
    .btn-auth {
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 13px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s;
      margin-top: 4px;
    }
    .btn-auth:hover:not(:disabled) { opacity: 0.9; }
    .btn-auth:disabled { opacity: 0.5; cursor: not-allowed; }
    .auth-switch { text-align: center; margin-top: 20px; font-size: 13px; color: var(--text-secondary); }
    .auth-switch a { color: var(--accent); text-decoration: none; font-weight: 600; }
    .auth-switch a:hover { text-decoration: underline; }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  errorMsg = '';

  form = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  get returnUrlParam() {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url ? { returnUrl: url } : {};
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    const { nombre, email } = this.form.value;
    await this.auth.login(email!, nombre!);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/mapa-resultados';
    this.router.navigateByUrl(returnUrl);
  }
}
