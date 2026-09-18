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
import { extractErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'soz-register',
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
        <div class="soz-auth-icon"><mat-icon>bolt</mat-icon></div>
        <mat-card-header>
          <mat-card-title>Быстрая регистрация</mat-card-title>
          <mat-card-subtitle>Один номер телефона — и вы в деле. Роль инвестора можно включить позже одной кнопкой.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="phoneForm" (ngSubmit)="requestOtp()" class="soz-form">
            <mat-form-field appearance="outline">
              <mat-label>Телефон</mat-label>
              <input matInput formControlName="phone" placeholder="+375291234567" [readonly]="otpRequested()" />
              <mat-icon matPrefix>smartphone</mat-icon>
            </mat-form-field>

            @if (!otpRequested()) {
              <button
                mat-raised-button
                color="primary"
                type="submit"
                class="soz-submit-btn"
                [disabled]="phoneForm.invalid || loading()"
              >
                @if (loading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Получить код по SMS
                }
              </button>
            }
          </form>

          @if (otpRequested()) {
            <form [formGroup]="finishForm" (ngSubmit)="submit()" class="soz-form soz-reveal">
              @if (devCode()) {
                <p class="soz-dev-hint">
                  <mat-icon inline>info</mat-icon>
                  Демо-режим: код подтверждения — <strong>{{ devCode() }}</strong>
                </p>
              }
              <mat-form-field appearance="outline">
                <mat-label>Код из SMS</mat-label>
                <input matInput formControlName="code" maxlength="6" />
                <mat-icon matPrefix>sms</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Придумайте пароль</mat-label>
                <input
                  matInput
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="new-password"
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
                [disabled]="finishForm.invalid || loading()"
              >
                @if (loading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Создать аккаунт
                }
              </button>
              <button mat-button type="button" class="soz-change-phone" (click)="changePhone()">
                Изменить номер
              </button>
            </form>
          } @else if (error()) {
            <p class="soz-error">{{ error() }}</p>
          }

          <p class="soz-auth-switch">Уже есть аккаунт? <a routerLink="/login">Войти</a></p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .soz-auth-card {
        width: 100%;
        max-width: 460px;
        position: relative;
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
      }
      .soz-reveal {
        animation: sozRiseIn 0.35s ease both;
        margin-top: 4px;
      }
      .soz-error {
        color: #b3261e;
        font-size: 13px;
      }
      .soz-dev-hint {
        background: #fff3cd;
        color: #664d03;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .soz-submit-btn {
        margin-top: 4px;
        height: 44px;
      }
      .soz-change-phone {
        align-self: center;
        font-size: 12px;
      }
      .soz-auth-switch {
        margin-top: 16px;
        font-size: 14px;
      }
    `,
  ],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly devCode = signal<string | null>(null);
  readonly otpRequested = signal(false);
  readonly showPassword = signal(false);

  readonly phoneForm = this.fb.nonNullable.group({
    phone: ['+375', [Validators.required, Validators.pattern(/^\+375\d{9}$/)]],
  });
  readonly finishForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  requestOtp(): void {
    if (this.phoneForm.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { phone } = this.phoneForm.getRawValue();
    this.auth.requestOtp(phone, 'REGISTRATION').subscribe({
      next: (res) => {
        this.loading.set(false);
        this.devCode.set(res.devCode ?? null);
        this.otpRequested.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err, 'Не удалось отправить код'));
      },
    });
  }

  changePhone(): void {
    this.otpRequested.set(false);
    this.devCode.set(null);
    this.finishForm.reset();
    this.phoneForm.enable();
  }

  submit(): void {
    if (this.finishForm.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const phone = this.phoneForm.getRawValue().phone;
    const { code, password } = this.finishForm.getRawValue();
    this.auth.register(phone, code, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/kyc');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractErrorMessage(err, 'Не удалось завершить регистрацию'));
      },
    });
  }
}
