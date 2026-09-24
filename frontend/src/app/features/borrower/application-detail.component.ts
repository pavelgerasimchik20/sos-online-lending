import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoanApplicationsService } from '../../core/services/loan-applications.service';
import { MarketplaceService } from '../../core/services/marketplace.service';
import { LoanApplication, LoanApplicationStatus } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { OtpConfirmComponent } from '../../shared/components/otp-confirm.component';
import { extractErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'soz-application-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StatusBadgeComponent,
    OtpConfirmComponent,
  ],
  template: `
    @if (application(); as app) {
      <div class="soz-page soz-app-detail-page">
        <a routerLink="/borrower" class="soz-back"><mat-icon inline>arrow_back</mat-icon> К списку</a>

        <mat-card class="soz-money-card soz-app-card">
          <div class="soz-app-head">
            @if (app.grade) {
              <div class="soz-grade-badge" [class]="'soz-grade-' + app.grade">{{ app.grade }}</div>
            } @else {
              <div class="soz-grade-badge soz-grade-pending"><mat-icon>hourglass_top</mat-icon></div>
            }
            <div class="soz-app-head-text">
              <div class="soz-app-amount">{{ app.requestedAmountByn }} BYN</div>
              <div class="soz-app-sub">{{ app.requestedTermMonths }} мес. · {{ app.purpose }}</div>
            </div>
            <soz-status-badge [status]="app.status" />
          </div>

          @if (app.status === Status.AWAITING_BORROWER_CONFIRMATION) {
            <div class="soz-offer-banner">
              <mat-icon class="soz-offer-icon">notifications_active</mat-icon>
              <div class="soz-offer-text">
                <strong>Инвестор предложил профинансировать эту заявку!</strong>
                <span>{{ app.approvedAmountByn }} BYN, {{ app.annualRatePercent }}% годовых. Посмотрите договор и решите.</span>
              </div>
              @if (showAcceptOtp()) {
                <soz-otp-confirm
                  title="Подтвердите получение денег ОТП-кодом"
                  [requestFn]="requestOtp"
                  [confirmFn]="signAndAccept(app.id)"
                  (confirmed)="onAccepted(app.id)"
                  (cancelled)="showAcceptOtp.set(false)"
                />
              } @else {
                <div class="soz-offer-actions">
                  <button mat-stroked-button (click)="openContract(app.id)" [disabled]="loadingContract()">
                    <mat-icon>description</mat-icon> Договор
                  </button>
                  <button mat-raised-button color="primary" (click)="showAcceptOtp.set(true)">
                    <mat-icon>check</mat-icon> Взять деньги
                  </button>
                  <button mat-stroked-button color="warn" (click)="decline(app.id)" [disabled]="responding() !== null">
                    @if (responding() === app.id) {
                      <mat-spinner diameter="18"></mat-spinner>
                    } @else {
                      Отклонить
                    }
                  </button>
                </div>
              }
            </div>
          }

          @if (app.status === Status.PUBLISHED_FOR_FUNDING || app.status === Status.FUNDED || app.status === Status.AWAITING_BORROWER_CONFIRMATION) {
            <div class="soz-terms-grid">
              <div><span>Одобренная сумма</span><strong>{{ app.approvedAmountByn }} BYN</strong></div>
              <div><span>Ставка</span><strong>{{ app.annualRatePercent }}% годовых</strong></div>
              @if (app.status === Status.PUBLISHED_FOR_FUNDING) {
                <div><span>Собрано</span><strong>{{ app.fundedAmountByn }} / {{ app.approvedAmountByn }} BYN</strong></div>
              }
              @if (app.fundingDeadline && app.status === Status.PUBLISHED_FOR_FUNDING) {
                <div><span>Сбор средств до</span><strong>{{ app.fundingDeadline | date: 'dd.MM.yyyy HH:mm' }}</strong></div>
              }
            </div>
            @if (app.status === Status.PUBLISHED_FOR_FUNDING) {
              <div class="soz-progress-track">
                <div class="soz-progress-fill" [style.width.%]="fundingPercent(app)"></div>
              </div>
            }
          }

          @if (app.scoringReasons?.length) {
            <h3 class="soz-reasons-title"><mat-icon inline>fact_check</mat-icon> Обоснование решения скоринга</h3>
            <ul class="soz-reasons-list">
              @for (reason of app.scoringReasons; track reason) {
                <li [class.soz-reason-negative]="isNegative(reason)">
                  <mat-icon>{{ isNegative(reason) ? 'remove_circle' : 'check_circle' }}</mat-icon>
                  <span>{{ reason }}</span>
                </li>
              }
            </ul>
          }

          <div class="soz-app-actions">
            @if (app.status === Status.FUNDED && app.loanId) {
              <a mat-raised-button color="primary" [routerLink]="['/borrower/loans', app.loanId]">
                <mat-icon>account_balance_wallet</mat-icon> Перейти к займу
              </a>
            }
            @if (app.status === Status.PUBLISHED_FOR_FUNDING) {
              <button mat-stroked-button color="warn" (click)="cancel(app.id)">
                <mat-icon>close</mat-icon> Отменить заявку
              </button>
            }
          </div>
        </mat-card>
      </div>
    }
  `,
  styles: [
    `
      .soz-back {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 16px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-app-detail-page {
        max-width: 640px;
      }
      .soz-app-card {
        padding: 20px 24px;
      }
      .soz-app-head {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .soz-grade-badge {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 18px;
        color: white;
        background: #16a34a;
        box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.3);
      }
      .soz-grade-D,
      .soz-grade-E {
        background: #ca8a04;
      }
      .soz-grade-pending {
        background: var(--mat-sys-outline);
      }
      .soz-app-head-text {
        flex: 1;
        min-width: 160px;
      }
      .soz-app-amount {
        font-size: 26px;
        font-weight: 800;
        color: var(--soz-money-green-dark);
        line-height: 1.1;
      }
      .soz-app-sub {
        font-size: 13px;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 2px;
      }
      .soz-offer-banner {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        margin-bottom: 16px;
        border-radius: 14px;
        flex-wrap: wrap;
        background: linear-gradient(120deg, rgba(37, 99, 235, 0.1), rgba(16, 122, 87, 0.1));
        border: 1px solid color-mix(in srgb, #2563eb 25%, transparent);
      }
      .soz-offer-icon {
        color: #2563eb;
        font-size: 28px;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
      }
      .soz-offer-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 180px;
        gap: 2px;
        font-size: 13px;
      }
      .soz-offer-text span {
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-offer-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .soz-terms-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px 20px;
        padding: 14px 16px;
        margin-bottom: 6px;
        border-radius: 12px;
        background: var(--mat-sys-surface-container);
      }
      .soz-terms-grid div {
        display: flex;
        flex-direction: column;
      }
      .soz-terms-grid span {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-terms-grid strong {
        font-size: 16px;
      }
      .soz-progress-track {
        height: 8px;
        border-radius: 999px;
        background: var(--mat-sys-surface-container-highest);
        overflow: hidden;
        margin: 10px 2px 16px;
      }
      .soz-progress-fill {
        height: 100%;
        background: var(--soz-money-gradient-bold);
        transition: width 0.4s ease;
      }
      .soz-reasons-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        margin: 16px 0 8px;
      }
      .soz-reasons-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .soz-reasons-list li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 13px;
        padding: 8px 10px;
        border-radius: 10px;
        background: var(--mat-sys-surface-container);
      }
      .soz-reasons-list mat-icon {
        color: var(--soz-money-green);
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .soz-reason-negative mat-icon {
        color: #b3261e;
      }
      .soz-app-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class ApplicationDetailComponent implements OnInit {
  readonly Status = LoanApplicationStatus;
  readonly application = signal<LoanApplication | null>(null);
  readonly responding = signal<string | null>(null);
  readonly loadingContract = signal(false);
  readonly showAcceptOtp = signal(false);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly applicationsService: LoanApplicationsService,
    private readonly marketplaceService: MarketplaceService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.applicationsService.getMine(id).subscribe((app) => this.application.set(app));
  }

  fundingPercent(app: LoanApplication): number {
    const approved = Number(app.approvedAmountByn ?? 0);
    if (approved <= 0) return 0;
    return Math.min(100, Math.round((Number(app.fundedAmountByn) / approved) * 100));
  }

  isNegative(reason: string): boolean {
    return /\(-\d/.test(reason) || reason.includes('отклонена') || reason.includes('Есть активное дело');
  }

  cancel(id: string): void {
    this.applicationsService.cancel(id).subscribe((app) => this.application.set(app));
  }

  openContract(applicationId: string): void {
    this.loadingContract.set(true);
    this.marketplaceService.getCommitmentForApplication(applicationId).subscribe({
      next: (commitment) => {
        this.loadingContract.set(false);
        this.router.navigateByUrl(`/contract/${commitment.id}`);
      },
      error: (err) => {
        this.loadingContract.set(false);
        this.snackBar.open(extractErrorMessage(err, 'Не удалось открыть договор'), 'ОК', { duration: 4000 });
      },
    });
  }

  readonly requestOtp = () => this.marketplaceService.requestSignOtp();

  signAndAccept(applicationId: string) {
    return (code: string) => this.marketplaceService.confirmFunding(applicationId, code);
  }

  onAccepted(applicationId: string): void {
    this.showAcceptOtp.set(false);
    this.snackBar.open('Вы подписали договор — деньги зачислены на ваш баланс.', 'ОК', { duration: 4000 });
    this.applicationsService.getMine(applicationId).subscribe((app) => this.application.set(app));
  }

  decline(applicationId: string): void {
    this.responding.set(applicationId);
    this.marketplaceService.declineFunding(applicationId).subscribe({
      next: () => {
        this.responding.set(null);
        this.snackBar.open('Предложение отклонено.', 'ОК', { duration: 4000 });
        this.applicationsService.getMine(applicationId).subscribe((app) => this.application.set(app));
      },
      error: (err) => {
        this.responding.set(null);
        this.snackBar.open(extractErrorMessage(err, 'Не удалось обработать ответ'), 'ОК', { duration: 4000 });
      },
    });
  }
}
