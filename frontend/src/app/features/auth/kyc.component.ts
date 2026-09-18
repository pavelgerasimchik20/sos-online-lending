import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProfilesService } from '../../core/services/profiles.service';
import { AuthService } from '../../core/services/auth.service';
import { KycStatus, MsiStatus, UserRole } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { extractErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'soz-kyc',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StatusBadgeComponent,
  ],
  template: `
    <div class="soz-page soz-kyc-page">
      <div class="soz-steps-track">
        <div class="soz-step" [class.soz-step--done]="true">
          <mat-icon>badge</mat-icon><span>Анкета</span>
        </div>
        <div class="soz-step-line" [class.soz-step-line--done]="currentStatus() === Kyc.VERIFIED"></div>
        <div class="soz-step" [class.soz-step--done]="currentStatus() === Kyc.VERIFIED">
          <mat-icon>fingerprint</mat-icon><span>МСИ</span>
        </div>
        <div class="soz-step-line" [class.soz-step-line--done]="msiStatus() === Msi.VERIFIED"></div>
        <div class="soz-step" [class.soz-step--done]="msiStatus() === Msi.VERIFIED">
          <mat-icon>verified</mat-icon><span>Готово</span>
        </div>
      </div>

      <mat-card class="soz-kyc-card">
        <mat-card-header>
          <mat-card-title>Анкета для идентификации (KYC)</mat-card-title>
          <mat-card-subtitle>
            Согласно законодательству РБ платформа обязана идентифицировать участников сделки перед выдачей/получением займа.
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (currentStatus()) {
            <p class="soz-current-status">
              Текущий статус: <soz-status-badge [status]="currentStatus()!" />
              @if (rejectionReason()) {
                <span class="soz-reason"> — {{ rejectionReason() }}</span>
              }
            </p>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="soz-form soz-form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Фамилия</mat-label>
              <input matInput formControlName="lastName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Имя</mat-label>
              <input matInput formControlName="firstName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Отчество</mat-label>
              <input matInput formControlName="patronymic" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Дата рождения</mat-label>
              <input matInput type="date" formControlName="birthDate" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Серия и номер паспорта</mat-label>
              <input
                matInput
                formControlName="passportSeriesNumber"
                placeholder="MP 1234567"
                maxlength="10"
                style="text-transform: uppercase"
              />
              <mat-icon matPrefix>badge</mat-icon>
              <mat-hint>2 латинские буквы + 7 цифр, напр. MP1234567</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Кем выдан</mat-label>
              <input matInput formControlName="passportIssuedBy" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Дата выдачи паспорта</mat-label>
              <input matInput type="date" formControlName="passportIssuedDate" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Идентификационный номер (ИНН)</mat-label>
              <input matInput formControlName="inn" placeholder="3050588A123PB4" style="text-transform: uppercase" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Адрес регистрации</mat-label>
              <input matInput formControlName="registrationAddress" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Фактический адрес (если отличается)</mat-label>
              <input matInput formControlName="actualAddress" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Заявленный ежемесячный доход, BYN</mat-label>
              <input matInput type="number" formControlName="declaredMonthlyIncomeByn" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Место работы</mat-label>
              <input matInput formControlName="employer" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Реквизиты ЕРИП / номер счёта</mat-label>
              <input matInput formControlName="eripAccountRef" />
            </mat-form-field>

            @if (error()) {
              <div class="soz-error-box">
                <mat-icon>error_outline</mat-icon>
                <ul>
                  @for (line of errorLines(); track line) {
                    <li>{{ line }}</li>
                  }
                </ul>
              </div>
            }

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="soz-submit"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Отправить на проверку
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (currentStatus() === Kyc.VERIFIED) {
        <mat-card class="soz-kyc-card soz-msi-card soz-reveal">
          <mat-card-header>
            <div class="soz-msi-icon"><mat-icon>fingerprint</mat-icon></div>
            <mat-card-title>Идентификация через МСИ</mat-card-title>
            <mat-card-subtitle>
              Межбанковская система идентификации подтверждает, что вы — реальный владелец
              указанных паспортных данных. Обязательна перед подачей заявки или инвестированием.
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>
              Статус: <soz-status-badge [status]="msiStatus()" />
            </p>
            @if (msiReference()) {
              <p class="soz-hint">Референс проверки: {{ msiReference() }}</p>
            }
            @if (msiFailReason()) {
              <p class="soz-error">{{ msiFailReason() }}</p>
            }

            @if (msiStatus() !== Msi.VERIFIED) {
              <button mat-raised-button color="accent" (click)="verifyMsi()" [disabled]="msiLoading()">
                @if (msiLoading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container>
                    <mat-icon>fingerprint</mat-icon>
                    Пройти идентификацию через МСИ
                  </ng-container>
                }
              </button>
            } @else {
              <button mat-raised-button color="primary" (click)="goToCabinet()">
                <mat-icon>arrow_forward</mat-icon>
                Перейти в личный кабинет
              </button>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .soz-kyc-page {
        max-width: 720px;
        margin: 0 auto;
      }
      .soz-steps-track {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        margin: 16px auto 24px;
      }
      .soz-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--mat-sys-on-surface-variant);
        opacity: 0.6;
      }
      .soz-step mat-icon {
        width: 32px;
        height: 32px;
        font-size: 32px;
        border-radius: 50%;
        background: var(--mat-sys-surface-container-highest);
        padding: 6px;
        box-sizing: border-box;
        transition: all 0.3s ease;
      }
      .soz-step--done {
        opacity: 1;
      }
      .soz-step--done mat-icon {
        background: var(--soz-money-gradient);
        color: white;
      }
      .soz-step-line {
        width: 40px;
        height: 2px;
        background: var(--mat-sys-surface-container-highest);
        transition: background 0.3s ease;
      }
      .soz-step-line--done {
        background: var(--soz-money-green);
      }
      .soz-kyc-card {
        margin: 0 auto 24px;
      }
      .soz-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 8px 16px;
      }
      .soz-submit {
        grid-column: 1 / -1;
        justify-self: start;
        margin-top: 8px;
      }
      .soz-current-status {
        margin-bottom: 16px;
      }
      .soz-reason {
        color: #b3261e;
        font-size: 13px;
      }
      .soz-error {
        grid-column: 1 / -1;
        color: #b3261e;
        font-size: 13px;
      }
      .soz-error-box {
        grid-column: 1 / -1;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 10px;
        background: #fbdada;
        color: #7f1414;
      }
      .soz-error-box mat-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }
      .soz-error-box ul {
        margin: 0;
        padding-left: 18px;
        font-size: 13px;
        line-height: 1.5;
      }
      .soz-msi-card {
        position: relative;
        border: 1px solid color-mix(in srgb, var(--soz-money-green) 30%, transparent);
      }
      .soz-msi-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: var(--soz-money-gradient);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
      }
      .soz-hint {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class KycComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly Kyc = KycStatus;
  readonly Msi = MsiStatus;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly errorLines = computed(() => (this.error() ?? '').split(';').map((s) => s.trim()).filter(Boolean));
  readonly currentStatus = signal<KycStatus | null>(null);
  readonly rejectionReason = signal<string | null>(null);

  readonly msiStatus = signal<MsiStatus>(MsiStatus.NOT_STARTED);
  readonly msiReference = signal<string | null>(null);
  readonly msiFailReason = signal<string | null>(null);
  readonly msiLoading = signal(false);

  readonly form = this.fb.nonNullable.group({
    lastName: ['', Validators.required],
    firstName: ['', Validators.required],
    patronymic: [''],
    birthDate: ['', Validators.required],
    passportSeriesNumber: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}\s?\d{7}$/)]],
    passportIssuedBy: ['', Validators.required],
    passportIssuedDate: ['', Validators.required],
    inn: ['', [Validators.required, Validators.pattern(/^\d{7}[A-Za-z]\d{3}[A-Za-z]{2}\d$/)]],
    registrationAddress: ['', Validators.required],
    actualAddress: [''],
    declaredMonthlyIncomeByn: [0, [Validators.required, Validators.min(0)]],
    employer: [''],
    eripAccountRef: [''],
  });

  constructor(
    private readonly profilesService: ProfilesService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.profilesService.getMine().subscribe((profile) => {
      if (profile) {
        this.currentStatus.set(profile.kycStatus);
        this.rejectionReason.set(profile.kycRejectionReason ?? null);
        this.msiStatus.set(profile.msiStatus);
        this.msiReference.set(profile.msiReference ?? null);
        this.msiFailReason.set(profile.msiFailReason ?? null);
        this.form.patchValue({
          ...profile,
          passportSeriesNumber: `${profile.passportSeries}${profile.passportNumber}`,
        });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    const combined = value.passportSeriesNumber.replace(/\s+/g, '').toUpperCase();
    const passportSeries = combined.slice(0, 2);
    const passportNumber = combined.slice(2);
    const { passportSeriesNumber, ...rest } = value;
    this.profilesService
      .submitMine({
        ...rest,
        passportSeries,
        passportNumber,
        inn: value.inn.toUpperCase(),
        declaredMonthlyIncomeByn: Number(value.declaredMonthlyIncomeByn),
      })
      .subscribe({
        next: (profile) => {
          this.loading.set(false);
          this.currentStatus.set(profile.kycStatus);
          this.rejectionReason.set(profile.kycRejectionReason ?? null);
          this.msiStatus.set(profile.msiStatus);
          this.msiReference.set(profile.msiReference ?? null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(extractErrorMessage(err, 'Не удалось сохранить анкету'));
        },
      });
  }

  verifyMsi(): void {
    this.msiLoading.set(true);
    this.msiFailReason.set(null);
    this.profilesService.verifyMsi().subscribe({
      next: (profile) => {
        this.msiLoading.set(false);
        this.msiStatus.set(profile.msiStatus);
        this.msiReference.set(profile.msiReference ?? null);
        this.msiFailReason.set(profile.msiFailReason ?? null);
      },
      error: (err) => {
        this.msiLoading.set(false);
        this.msiFailReason.set(extractErrorMessage(err, 'Не удалось выполнить идентификацию через МСИ'));
      },
    });
  }

  goToCabinet(): void {
    const target = this.auth.hasRole(UserRole.LENDER) ? '/lender' : '/borrower';
    this.router.navigateByUrl(target);
  }
}
