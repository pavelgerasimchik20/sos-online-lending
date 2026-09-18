import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { LoanApplicationsService } from '../../core/services/loan-applications.service';
import { LoansService } from '../../core/services/loans.service';
import { ProfilesService } from '../../core/services/profiles.service';
import { AuthService } from '../../core/services/auth.service';
import {
  LoanApplication,
  Loan,
  LoanApplicationStatus,
  Profile,
  KycStatus,
  MsiStatus,
  UserRole,
} from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { VerificationBannerComponent } from '../../shared/components/verification-banner.component';

@Component({
  selector: 'soz-borrower-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    StatusBadgeComponent,
    VerificationBannerComponent,
  ],
  template: `
    <div class="soz-page">
      <div class="soz-header-row">
        <div>
          <h1>Кабинет заёмщика</h1>
          <p class="soz-subtle">Управляйте заявками и займами в одном месте</p>
        </div>
        @if (isFullyVerified()) {
          @if (!hasActiveApplication()) {
            <a mat-raised-button color="primary" class="soz-cta-btn" routerLink="/borrower/apply">
              <mat-icon>add_circle</mat-icon> Подать заявку на заём
            </a>
          } @else if (activeApplication(); as activeApp) {
            <a mat-stroked-button color="primary" class="soz-cta-btn" [routerLink]="['/borrower/applications', activeApp.id]">
              <mat-icon>hourglass_top</mat-icon> У вас уже есть заявка в обработке — посмотреть
            </a>
          }
        }
      </div>

      <soz-verification-banner [profile]="profile()" />

      <div class="soz-stat-row">
        <div class="soz-stat-tile">
          <mat-icon>account_balance</mat-icon>
          <div><span>Активных займов</span><strong>{{ activeLoansCount() }}</strong></div>
        </div>
        <div class="soz-stat-tile">
          <mat-icon>payments</mat-icon>
          <div><span>Общая сумма долга</span><strong>{{ totalOutstanding() }} BYN</strong></div>
        </div>
        <div class="soz-stat-tile">
          <mat-icon>description</mat-icon>
          <div><span>Всего заявок</span><strong>{{ applications().length }}</strong></div>
        </div>
      </div>

      @if (!auth.hasRole(UserRole.LENDER)) {
        <mat-card class="soz-become-lender-card">
          <mat-icon>trending_up</mat-icon>
          <div class="soz-become-lender-text">
            <strong>Есть свободные деньги? Зарабатывайте на них.</strong>
            <span>Станьте инвестором в один клик — используем ту же анкету, без повторного KYC.</span>
          </div>
          <button mat-raised-button color="accent" (click)="becomeLender()" [disabled]="becomingLender()">
            Стать инвестором
          </button>
        </mat-card>
      }

      <mat-tab-group>
        <mat-tab label="Мои займы">
          @if (loans().length === 0) {
            <p class="soz-empty">Активных займов пока нет.</p>
          } @else {
            <div class="soz-card-grid">
              @for (loan of loans(); track loan.id) {
                <mat-card [routerLink]="['/borrower/loans', loan.id]" class="soz-clickable-card soz-money-card">
                  <mat-card-header>
                    <mat-card-title>{{ loan.principalByn }} BYN</mat-card-title>
                    <mat-card-subtitle>{{ loan.annualRatePercent }}% годовых, {{ loan.termMonths }} мес.</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <p>Остаток долга: <strong>{{ loan.outstandingPrincipalByn }} BYN</strong></p>
                    @if (loan.accruedPenaltyByn > 0) {
                      <p class="soz-penalty">Начислена пеня: {{ loan.accruedPenaltyByn }} BYN</p>
                    }
                    <soz-status-badge [status]="loan.status" />
                  </mat-card-content>
                </mat-card>
              }
            </div>
          }
        </mat-tab>
        <mat-tab label="Мои заявки">
          @if (applications().length === 0) {
            <p class="soz-empty">Вы ещё не подавали заявок.</p>
          } @else {
            <div class="soz-card-grid">
              @for (app of applications(); track app.id) {
                <mat-card [routerLink]="['/borrower/applications', app.id]" class="soz-clickable-card soz-money-card">
                  <mat-card-header>
                    <mat-card-title>{{ app.requestedAmountByn }} BYN на {{ app.requestedTermMonths }} мес.</mat-card-title>
                    <mat-card-subtitle>{{ app.purpose }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <soz-status-badge [status]="app.status" />
                    @if (app.status === Status.PUBLISHED_FOR_FUNDING) {
                      <p class="soz-funding-progress">
                        Собрано {{ app.fundedAmountByn }} из {{ app.approvedAmountByn }} BYN
                      </p>
                    }
                  </mat-card-content>
                </mat-card>
              }
            </div>
          }
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .soz-header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }
      .soz-subtle {
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
        margin-top: 2px;
      }
      .soz-cta-btn {
        height: 44px;
      }
      .soz-stat-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      .soz-stat-tile {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-radius: 14px;
        background: var(--mat-sys-surface-container);
        animation: sozRiseIn 0.4s ease both;
      }
      .soz-stat-tile mat-icon {
        color: var(--soz-money-green);
        background: color-mix(in srgb, var(--soz-money-green) 14%, transparent);
        border-radius: 10px;
        padding: 8px;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
      .soz-stat-tile div {
        display: flex;
        flex-direction: column;
      }
      .soz-stat-tile span {
        font-size: 11px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-stat-tile strong {
        font-size: 18px;
      }
      .soz-become-lender-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        margin-bottom: 20px;
        background: linear-gradient(120deg, rgba(16, 122, 87, 0.08), rgba(217, 164, 6, 0.14));
      }
      .soz-become-lender-card mat-icon {
        color: var(--soz-money-gold);
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
      .soz-become-lender-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 2px;
        font-size: 13px;
      }
      .soz-become-lender-text span {
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-empty {
        padding: 24px 0;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-clickable-card {
        cursor: pointer;
      }
      .soz-penalty {
        color: #b3261e;
      }
      .soz-funding-progress {
        font-size: 13px;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class BorrowerDashboardComponent implements OnInit {
  readonly Status = LoanApplicationStatus;
  readonly UserRole = UserRole;
  readonly applications = signal<LoanApplication[]>([]);
  readonly loans = signal<Loan[]>([]);
  readonly profile = signal<Profile | null>(null);
  readonly becomingLender = signal(false);

  readonly activeApplication = computed(
    () =>
      this.applications().find(
        (a) => a.status === LoanApplicationStatus.SUBMITTED || a.status === LoanApplicationStatus.PUBLISHED_FOR_FUNDING,
      ) ?? null,
  );
  readonly hasActiveApplication = computed(() => this.activeApplication() !== null);

  constructor(
    private readonly applicationsService: LoanApplicationsService,
    private readonly loansService: LoansService,
    private readonly profilesService: ProfilesService,
    public readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.applicationsService.listMine().subscribe((apps) => {
      this.applications.set(apps);
    });
    this.loansService.listMine().subscribe((loans) => this.loans.set(loans));
    this.profilesService.getMine().subscribe((p) => this.profile.set(p));
  }

  isFullyVerified(): boolean {
    const p = this.profile();
    return p?.kycStatus === KycStatus.VERIFIED && p?.msiStatus === MsiStatus.VERIFIED;
  }

  activeLoansCount(): number {
    return this.loans().filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE').length;
  }

  totalOutstanding(): number {
    return Math.round(this.loans().reduce((sum, l) => sum + Number(l.outstandingPrincipalByn), 0) * 100) / 100;
  }

  becomeLender(): void {
    this.becomingLender.set(true);
    this.auth.addRole(UserRole.LENDER).subscribe({
      next: () => {
        this.becomingLender.set(false);
        this.router.navigateByUrl('/lender');
      },
      error: () => this.becomingLender.set(false),
    });
  }
}
