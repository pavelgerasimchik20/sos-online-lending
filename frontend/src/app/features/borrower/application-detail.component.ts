import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { LoanApplicationsService } from '../../core/services/loan-applications.service';
import { LoanApplication, LoanApplicationStatus } from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'soz-application-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatListModule, StatusBadgeComponent],
  template: `
    @if (application(); as app) {
      <div class="soz-page">
        <a routerLink="/borrower" class="soz-back">← К списку</a>
        <mat-card>
          <mat-card-header>
            <mat-card-title>Заявка на {{ app.requestedAmountByn }} BYN, {{ app.requestedTermMonths }} мес.</mat-card-title>
            <mat-card-subtitle>{{ app.purpose }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p><soz-status-badge [status]="app.status" /></p>

            @if (app.grade) {
              <p>Скоринговый грейд: <strong>{{ app.grade }}</strong></p>
            }

            @if (app.status === Status.PUBLISHED_FOR_FUNDING || app.status === Status.FUNDED) {
              <p>Одобренная сумма: <strong>{{ app.approvedAmountByn }} BYN</strong></p>
              <p>Ставка: <strong>{{ app.annualRatePercent }}% годовых</strong></p>
              <p>Собрано: <strong>{{ app.fundedAmountByn }} / {{ app.approvedAmountByn }} BYN</strong></p>
              @if (app.fundingDeadline) {
                <p class="soz-hint">Срок сбора средств: до {{ app.fundingDeadline | date: 'dd.MM.yyyy HH:mm' }}</p>
              }
            }

            @if (app.scoringReasons?.length) {
              <h3>Обоснование решения</h3>
              <mat-list>
                @for (reason of app.scoringReasons; track reason) {
                  <mat-list-item>{{ reason }}</mat-list-item>
                }
              </mat-list>
            }

            @if (app.status === Status.FUNDED && app.loanId) {
              <a mat-raised-button color="primary" [routerLink]="['/borrower/loans', app.loanId]">Перейти к займу</a>
            }
            @if (app.status === Status.PUBLISHED_FOR_FUNDING) {
              <button mat-stroked-button color="warn" (click)="cancel(app.id)">Отменить заявку</button>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [
    `
      .soz-back {
        display: inline-block;
        margin-bottom: 12px;
      }
      .soz-hint {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class ApplicationDetailComponent implements OnInit {
  readonly Status = LoanApplicationStatus;
  readonly application = signal<LoanApplication | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly applicationsService: LoanApplicationsService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.applicationsService.getMine(id).subscribe((app) => this.application.set(app));
  }

  cancel(id: string): void {
    this.applicationsService.cancel(id).subscribe((app) => this.application.set(app));
  }
}
