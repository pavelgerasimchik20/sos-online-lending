import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WalletService } from '../../core/services/wallet.service';
import { LoansService } from '../../core/services/loans.service';
import { PaymentsService } from '../../core/services/payments.service';
import { ProfilesService } from '../../core/services/profiles.service';
import { AuthService } from '../../core/services/auth.service';
import { LenderWallet, LoanLenderShare, Profile, UserRole } from '../../core/models/models';
import { VerificationBannerComponent } from '../../shared/components/verification-banner.component';
import { EarningsChartComponent, EarningsPoint } from '../../shared/components/earnings-chart.component';

@Component({
  selector: 'soz-lender-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    VerificationBannerComponent,
    EarningsChartComponent,
  ],
  template: `
    <div class="soz-page">
      <div class="soz-header-row">
        <div>
          <h1>Кабинет инвестора</h1>
          <p class="soz-subtle">Инвестируйте в проверенные заявки и следите за доходом</p>
        </div>
        <a mat-raised-button color="primary" class="soz-cta-btn" routerLink="/lender/marketplace">
          <mat-icon>storefront</mat-icon> Маркетплейс заявок
        </a>
      </div>

      <soz-verification-banner [profile]="profile()" />

      @if (wallet(); as w) {
        <div class="soz-wallet-summary soz-card-grid">
          <mat-card class="soz-money-card">
            <mat-card-content>
              <mat-icon class="soz-tile-icon">account_balance_wallet</mat-icon>
              <span class="soz-metric-label">Баланс кошелька</span>
              <div class="soz-metric-value">{{ w.balanceByn }} BYN</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="soz-money-card">
            <mat-card-content>
              <mat-icon class="soz-tile-icon">savings</mat-icon>
              <span class="soz-metric-label">Инвестировано</span>
              <div class="soz-metric-value">{{ w.totalInvestedByn }} BYN</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="soz-money-card soz-highlight-card">
            <mat-card-content>
              <mat-icon class="soz-tile-icon">trending_up</mat-icon>
              <span class="soz-metric-label">Заработано процентов</span>
              <div class="soz-metric-value">{{ w.totalEarnedInterestByn }} BYN</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="soz-money-card">
            <mat-card-content>
              <form [formGroup]="topUpForm" (ngSubmit)="topUp()" class="soz-topup-form">
                <mat-form-field appearance="outline">
                  <mat-label>Пополнить, BYN</mat-label>
                  <input matInput type="number" formControlName="amountByn" />
                  <mat-icon matPrefix>add_card</mat-icon>
                </mat-form-field>
                <button mat-stroked-button color="primary" type="submit" [disabled]="topUpForm.invalid">
                  Пополнить (мок)
                </button>
              </form>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <mat-card class="soz-earnings-card">
        <mat-card-header>
          <mat-card-title>Динамика заработка</mat-card-title>
          <mat-card-subtitle>Накопительный доход от процентов и пени по выплатам заёмщиков</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <soz-earnings-chart [points]="earningsSeries()" />
        </mat-card-content>
      </mat-card>

      @if (!auth.hasRole(UserRole.BORROWER)) {
        <mat-card class="soz-become-borrower-card">
          <mat-icon>account_balance</mat-icon>
          <div class="soz-become-text">
            <strong>Нужны деньги на личные цели?</strong>
            <span>Подайте заявку на заём как заёмщик — та же учётная запись, тот же профиль.</span>
          </div>
          <button mat-raised-button color="accent" (click)="becomeBorrower()" [disabled]="becoming()">
            Стать заёмщиком
          </button>
        </mat-card>
      }

      <h2>Мой портфель</h2>
      @if (portfolio().length === 0) {
        <p class="soz-empty">Вы ещё не участвовали в финансировании займов.</p>
      } @else {
        <div class="soz-card-grid">
          @for (share of portfolio(); track share.id) {
            <mat-card [routerLink]="['/lender/loans', share.loanId]" class="soz-clickable-card soz-money-card">
              <mat-card-header>
                <mat-card-title>Доля {{ share.principalShareByn }} BYN</mat-card-title>
                <mat-card-subtitle>{{ (share.shareRatio * 100).toFixed(1) }}% от займа</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Получено тела: {{ share.receivedPrincipalByn }} BYN</p>
                <p>Получено процентов: {{ share.receivedInterestByn }} BYN</p>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
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
      .soz-wallet-summary {
        margin-bottom: 20px;
      }
      .soz-tile-icon {
        color: var(--soz-money-green);
        margin-bottom: 4px;
      }
      .soz-highlight-card {
        background: linear-gradient(135deg, rgba(16, 122, 87, 0.12), rgba(217, 164, 6, 0.1));
      }
      .soz-metric-label {
        display: block;
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-metric-value {
        font-size: 22px;
        font-weight: 600;
      }
      .soz-topup-form {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .soz-earnings-card {
        margin-bottom: 20px;
      }
      .soz-become-borrower-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 20px;
        margin-bottom: 20px;
        background: linear-gradient(120deg, rgba(37, 99, 235, 0.08), rgba(16, 122, 87, 0.1));
      }
      .soz-become-borrower-card mat-icon {
        color: #2563eb;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
      .soz-become-text {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 2px;
        font-size: 13px;
      }
      .soz-become-text span {
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-empty {
        padding: 16px 0;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-clickable-card {
        cursor: pointer;
      }
    `,
  ],
})
export class LenderDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly UserRole = UserRole;

  readonly wallet = signal<LenderWallet | null>(null);
  readonly portfolio = signal<LoanLenderShare[]>([]);
  readonly profile = signal<Profile | null>(null);
  readonly earningsSeries = signal<EarningsPoint[]>([]);
  readonly becoming = signal(false);

  readonly topUpForm = this.fb.nonNullable.group({
    amountByn: [500, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private readonly walletService: WalletService,
    private readonly loansService: LoansService,
    private readonly paymentsService: PaymentsService,
    private readonly profilesService: ProfilesService,
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadWallet();
    this.loansService.myPortfolio().subscribe((p) => this.portfolio.set(p));
    this.profilesService.getMine().subscribe((p) => this.profile.set(p));
    this.paymentsService.listPayoutsMine().subscribe((payouts) => {
      const byDay = new Map<string, number>();
      for (const payout of payouts) {
        const day = payout.createdAt.slice(0, 10);
        const earn = Number(payout.interestPortionByn) + Number(payout.penaltyPortionByn);
        byDay.set(day, (byDay.get(day) ?? 0) + earn);
      }
      const days = Array.from(byDay.keys()).sort();
      let cumulative = 0;
      const series: EarningsPoint[] = days.map((day) => {
        cumulative += byDay.get(day)!;
        return { date: day, cumulativeByn: Math.round(cumulative * 100) / 100 };
      });
      this.earningsSeries.set(series);
    });
  }

  private loadWallet(): void {
    this.walletService.getMine().subscribe((w) => this.wallet.set(w));
  }

  topUp(): void {
    if (this.topUpForm.invalid) return;
    const amountByn = this.topUpForm.getRawValue().amountByn!;
    this.walletService.topUp(amountByn).subscribe((w) => {
      this.wallet.set(w);
      this.snackBar.open(`Кошелёк пополнен на ${amountByn} BYN`, 'ОК', { duration: 3000 });
    });
  }

  becomeBorrower(): void {
    this.becoming.set(true);
    this.auth.addRole(UserRole.BORROWER).subscribe({
      next: () => {
        this.becoming.set(false);
        this.router.navigateByUrl('/borrower');
      },
      error: () => this.becoming.set(false),
    });
  }
}
