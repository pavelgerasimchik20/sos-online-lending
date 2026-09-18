import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { LoansService } from '../../core/services/loans.service';
import { Loan, LoanLenderShare, PaymentScheduleItem } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ScheduleTableComponent } from '../../shared/components/schedule-table.component';

@Component({
  selector: 'soz-lender-loan-view',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, StatusBadgeComponent, ScheduleTableComponent],
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
    `,
  ],
})
export class LenderLoanViewComponent implements OnInit {
  readonly loan = signal<Loan | null>(null);
  readonly schedule = signal<PaymentScheduleItem[]>([]);
  readonly myShare = signal<LoanLenderShare | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly loansService: LoansService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loansService.getOne(id).subscribe((l) => this.loan.set(l));
    this.loansService.getSchedule(id).subscribe((items) => this.schedule.set(items));
    this.loansService.myPortfolio().subscribe((shares) => {
      this.myShare.set(shares.find((s) => s.loanId === id) ?? null);
    });
  }
}
