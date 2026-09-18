import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/models';
import { extractErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'soz-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="soz-auth-screen">
      <div class="soz-auth-bg-image"></div>
      <div class="soz-auth-bg-overlay"></div>
      <span class="soz-currency-badge soz-currency-usd">$</span>
      <span class="soz-currency-badge soz-currency-eur">€</span>
      <span class="soz-currency-badge soz-currency-byn">Br</span>

      <mat-card class="soz-auth-card soz-glass-card soz-reveal">
        <div class="soz-auth-icon"><mat-icon>account_balance_wallet</mat-icon></div>
        <mat-card-header>
          <mat-card-title>С возвращением!</mat-card-title>
          <mat-card-subtitle>Войдите, чтобы управлять займами и инвестициями</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="soz-form">
            <mat-form-field appearance="outline">
              <mat-label>Телефон или логин</mat-label>
              <input matInput formControlName="login" placeholder="+375291234567" autocomplete="username" />
              <mat-icon matPrefix>person</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Пароль</mat-label>
              <input
                matInput
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
              />
              <mat-icon matPrefix>lock</mat-icon>
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Скрыть пароль' : 'Показать пароль'"
              >
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (error()) {
              <p class="soz-error">{{ error() }}</p>
            }

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="soz-submit-btn"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Войти
              }
            </button>
          </form>
          <p class="soz-auth-switch">Нет аккаунта? <a routerLink="/register">Зарегистрироваться за 30 секунд</a></p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .soz-auth-card {
        width: 100%;
        max-width: 420px;
        position: relative;
        overflow: visible;
        z-index: 1;
        animation: sozRiseIn 0.5s ease both;
        backdrop-filter: blur(10px);
        background: color-mix(in srgb, var(--mat-sys-surface) 92%, transparent);
        box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.55);
      }
      .soz-auth-card mat-card-header {
        padding-top: 22px;
      }
      .soz-auth-icon {
        position: absolute;
        top: -2rem;
        left: 24px;
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: var(--soz-money-gradient-bold);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 8px 20px -6px rgba(6, 95, 70, 0.7);
      }
      .soz-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }
      .soz-error {
        color: #b3261e;
        font-size: 13px;
      }
      .soz-submit-btn {
        margin-top: 8px;
        height: 44px;
      }
      .soz-auth-switch {
        margin-top: 16px;
        font-size: 14px;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    login: ['+375', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { login, password } = this.form.getRawValue();
    this.auth.login(login, password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.user.roles.includes(UserRole.ADMIN)) {
          this.router.navigateByUrl('/admin');
        } else if (res.user.roles.includes(UserRole.LENDER)) {
          this.router.navigateByUrl('/lender');
        } else {
          this.router.navigateByUrl('/borrower');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err, 'Не удалось войти'));
      },
    });
  }
}
