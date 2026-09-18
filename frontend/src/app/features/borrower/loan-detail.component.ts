import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoansService } from '../../core/services/loans.service';
import { PaymentsService } from '../../core/services/payments.service';
import { CollectionsService } from '../../core/services/collections.service';
import { Loan, PaymentScheduleItem, DefaultCase, ScheduleItemStatus } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ScheduleTableComponent } from '../../shared/components/schedule-table.component';
import { RepaymentChartComponent } from '../../shared/components/repayment-chart.component';
import { extractErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'soz-loan-detail',
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
    MatProgressSpinnerModule,
    StatusBadgeComponent,
    ScheduleTableComponent,
    RepaymentChartComponent,
  ],
  template: `
    @if (loan(); as l) {
      <div class="soz-page soz-printable">
        <a routerLink="/borrower" class="soz-back soz-no-print">← К списку</a>

        <div class="soz-print-header">
          <h1>SOS — график платежей по займу</h1>
          <p class="soz-hint">Заём №{{ l.id }}, сформировано {{ today | date: 'dd.MM.yyyy' }}</p>
        </div>

        <div class="soz-loan-layout soz-no-print-grid">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Заём {{ l.principalByn }} BYN</mat-card-title>
              <mat-card-subtitle>{{ l.annualRatePercent }}% годовых, {{ l.termMonths }} мес.</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p><soz-status-badge [status]="l.status" /></p>
              <p>Остаток основного долга: <strong>{{ l.outstandingPrincipalByn }} BYN</strong></p>
              @if (l.accruedPenaltyByn > 0) {
                <p class="soz-penalty">Начисленная пеня: {{ l.accruedPenaltyByn }} BYN</p>
              }
              <p class="soz-hint">ПСК: {{ l.fullCostOfCreditPercent }}% годовых</p>
              <p class="soz-hint">Выдан: {{ l.issuedAt | date: 'dd.MM.yyyy' }}</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="soz-no-print">
            <mat-card-header>
              <mat-card-title>Оплата через ЕРИП (мок)</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="payForm" (ngSubmit)="pay(l.id)" class="soz-pay-form">
                <mat-form-field appearance="outline">
                  <mat-label>Сумма платежа, BYN</mat-label>
                  <input matInput type="number" formControlName="amountByn" />
                  <mat-icon matPrefix>payments</mat-icon>
                </mat-form-field>
                <button mat-raised-button color="primary" type="submit" [disabled]="payForm.invalid || paying()">
                  @if (paying()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <ng-container><mat-icon>qr_code_2</mat-icon> Оплатить</ng-container>
                  }
                </button>
              </form>
              @if (payMessage()) {
                <p class="soz-pay-message">{{ payMessage() }}</p>
              }
            </mat-card-content>
          </mat-card>

          @if (defaultCase(); as dc) {
            <mat-card class="soz-default-card soz-no-print">
              <mat-card-header>
                <mat-card-title>Работа с просрочкой</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p><soz-status-badge [status]="dc.stage" /> — максимальная просрочка {{ dc.maxDaysOverdue }} дн.</p>
                @if (dc.preClaimNoticeText) {
                  <details>
                    <summary>Досудебная претензия</summary>
                    <pre>{{ dc.preClaimNoticeText }}</pre>
                  </details>
                }
                @if (dc.legalActionNoticeText) {
                  <details>
                    <summary>Уведомление о передаче на взыскание</summary>
                    <pre>{{ dc.legalActionNoticeText }}</pre>
                  </details>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>

        <div class="soz-schedule-header soz-no-print">
          <h2>Когда и сколько платить</h2>
          <button mat-stroked-button color="primary" (click)="print()">
            <mat-icon>print</mat-icon> Печать графика
          </button>
        </div>

        <mat-card class="soz-chart-card soz-no-print">
          <soz-repayment-chart [items]="schedule()" />
        </mat-card>

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
      .soz-print-header {
        display: none;
      }
      .soz-loan-layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .soz-penalty {
        color: #b3261e;
      }
      .soz-hint {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-pay-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .soz-pay-message {
        margin-top: 8px;
        font-size: 13px;
      }
      .soz-default-card {
        border: 1px solid #f3c6c6;
      }
      .soz-schedule-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
      }
      .soz-chart-card {
        padding: 16px;
        margin-bottom: 16px;
      }
      pre {
        white-space: pre-wrap;
        font-size: 12px;
        background: var(--mat-sys-surface-container-highest);
        padding: 8px;
        border-radius: 8px;
      }

      @media print {
        .soz-print-header {
          display: block;
        }
        .soz-no-print,
        .soz-no-print-grid > *:not(:first-child) {
          display: none !important;
        }
      }
    `,
  ],
})
export class LoanDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly loan = signal<Loan | null>(null);
  readonly schedule = signal<PaymentScheduleItem[]>([]);
  readonly defaultCase = signal<DefaultCase | null>(null);
  readonly paying = signal(false);
  readonly payMessage = signal<string | null>(null);
  readonly today = new Date();

  readonly payForm = this.fb.nonNullable.group({
    amountByn: [0, [Validators.required, Validators.min(1)]],
  });

  private loanId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly loansService: LoansService,
    private readonly paymentsService: PaymentsService,
    private readonly collectionsService: CollectionsService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loanId = this.route.snapshot.paramMap.get('id')!;
    this.refresh();
    this.collectionsService.forLoan(this.loanId).subscribe((dc) => this.defaultCase.set(dc));
  }

  private refresh(): void {
    this.loansService.getOne(this.loanId).subscribe((l) => this.loan.set(l));
    this.loansService.getSchedule(this.loanId).subscribe((items) => {
      this.schedule.set(items);
      const nextDue = items.find((i) => i.status !== ScheduleItemStatus.PAID);
      if (nextDue) {
        this.payForm.patchValue({
          amountByn: Number(nextDue.totalDueByn) + Number(nextDue.penaltyDueByn) - Number(nextDue.penaltyPaidByn),
        });
      }
    });
  }

  pay(loanId: string): void {
    if (this.payForm.invalid) return;
    this.paying.set(true);
    this.payMessage.set(null);
    const amountByn = this.payForm.getRawValue().amountByn!;
    this.paymentsService.initiate(loanId, amountByn).subscribe({
      next: (payment) => {
        this.paymentsService.confirm(payment.id).subscribe({
          next: () => {
            this.paying.set(false);
            this.payMessage.set('Платёж подтверждён через ЕРИП и зачислен в счёт погашения займа.');
            this.snackBar.open('Платёж успешно проведён', 'ОК', { duration: 4000 });
            this.refresh();
          },
          error: (err) => {
            this.paying.set(false);
            this.payMessage.set(extractErrorMessage(err, 'Не удалось подтвердить платёж'));
          },
        });
      },
      error: (err) => {
        this.paying.set(false);
        this.payMessage.set(extractErrorMessage(err, 'Не удалось инициировать платёж'));
      },
    });
  }

  print(): void {
    window.print();
  }
}
