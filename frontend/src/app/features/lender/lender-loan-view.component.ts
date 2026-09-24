import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { LoansService } from '../../core/services/loans.service';
import { PaymentsService } from '../../core/services/payments.service';
import { Loan, LoanLenderShare, LenderPayout, PaymentScheduleItem } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ScheduleTableComponent } from '../../shared/components/schedule-table.component';

@Component({
  selector: 'soz-lender-loan-view',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, StatusBadgeComponent, ScheduleTableComponent],
  template: `
    @if (loan(); as l) {
      <div class="soz-page">
        <a routerLink="/lender" class="soz-back">← К портфелю</a>
        <div class="soz-loan-layout">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Заём {{ l.principalByn }} BYN</mat-card-title>
              <mat-card-subtitle>{{ l.annualRatePercent }}% годовых, {{ l.termMonths }} мес.</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p><soz-status-badge [status]="l.status" /></p>
              <p>Остаток основного долга: <strong>{{ l.outstandingPrincipalByn }} BYN</strong></p>
            </mat-card-content>
          </mat-card>
          @if (myShare(); as s) {
            <mat-card>
              <mat-card-header>
                <mat-card-title>Моя доля</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p>Вложено: <strong>{{ s.principalShareByn }} BYN</strong> ({{ (s.shareRatio * 100).toFixed(1) }}%)</p>
                <p>Получено тела: {{ s.receivedPrincipalByn }} BYN</p>
                <p>Получено процентов: {{ s.receivedInterestByn }} BYN</p>
              </mat-card-content>
            </mat-card>
          }
        </div>

        @if (payouts().length > 0) {
          <h2>Поступления по займу</h2>
          <div class="soz-payout-list">
            @for (p of payouts(); track p.id) {
              <div class="soz-payout-row">
                <mat-icon>payments</mat-icon>
                <span class="soz-payout-date">{{ p.createdAt | date: 'dd.MM.yyyy HH:mm' }}</span>
                <span class="soz-payout-total">+{{ totalPayout(p) }} BYN</span>
                <span class="soz-payout-breakdown">
                  тело {{ p.principalPortionByn }} · проценты {{ p.interestPortionByn }}
                  @if (p.penaltyPortionByn > 0) { · пеня {{ p.penaltyPortionByn }} }
                </span>
              </div>
            }
          </div>
        }

        <h2>График платежей</h2>
        <soz-schedule-table [rows]="schedule()" />
      </div>
    }
  `,
  styles: [
    `
      .soz-back {
        display: inline-block;
        margin-bottom: 12px;
      }
      .soz-loan-layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .soz-payout-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 24px;
      }
      .soz-payout-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 10px;
        background: var(--mat-sys-surface-container);
        flex-wrap: wrap;
      }
      .soz-payout-row mat-icon {
        color: var(--soz-money-green);
      }
      .soz-payout-date {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        min-width: 120px;
      }
      .soz-payout-total {
        font-weight: 700;
        color: var(--soz-money-green-dark);
      }
      .soz-payout-breakdown {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        margin-left: auto;
      }
    `,
  ],
})
export class LenderLoanViewComponent implements OnInit {
  readonly loan = signal<Loan | null>(null);
  readonly schedule = signal<PaymentScheduleItem[]>([]);
  readonly myShare = signal<LoanLenderShare | null>(null);
  readonly payouts = signal<LenderPayout[]>([]);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly loansService: LoansService,
    private readonly paymentsService: PaymentsService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loansService.getOne(id).subscribe((l) => this.loan.set(l));
    this.loansService.getSchedule(id).subscribe((items) => this.schedule.set(items));
    this.loansService.myPortfolio().subscribe((shares) => {
      this.myShare.set(shares.find((s) => s.loanId === id) ?? null);
    });
    this.paymentsService.listPayoutsMine().subscribe((payouts) => {
      this.payouts.set(payouts.filter((p) => p.loanId === id));
    });
  }

  totalPayout(p: LenderPayout): number {
    return Math.round((Number(p.principalPortionByn) + Number(p.interestPortionByn) + Number(p.penaltyPortionByn)) * 100) / 100;
  }
}
