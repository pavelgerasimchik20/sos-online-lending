import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoanApplicationsService } from '../../core/services/loan-applications.service';
import { CalculatePreviewResult } from '../../core/models/models';
import { ScheduleTableComponent } from '../../shared/components/schedule-table.component';
import { extractErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'soz-apply',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    ScheduleTableComponent,
  ],
  template: `
    <div class="soz-page soz-apply-page">
      <h1>Подать заявку на заём</h1>

      <div class="soz-apply-layout">
        <mat-card class="soz-apply-form-card">
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" class="soz-form">
              <mat-form-field appearance="outline">
                <mat-label>Сумма займа, BYN</mat-label>
                <input matInput type="number" formControlName="amountByn" />
              </mat-form-field>
              <mat-slider min="100" max="7500" step="50" discrete>
                <input matSliderThumb formControlName="amountByn" />
              </mat-slider>

              <mat-form-field appearance="outline">
                <mat-label>Срок, месяцев</mat-label>
                <input matInput type="number" formControlName="termMonths" />
              </mat-form-field>
              <mat-slider min="1" max="12" step="1" discrete>
                <input matSliderThumb formControlName="termMonths" />
              </mat-slider>

              <mat-form-field appearance="outline">
                <mat-label>Цель займа</mat-label>
                <input matInput formControlName="purpose" placeholder="Например: ремонт, техника, лечение" />
              </mat-form-field>

              @if (error()) {
                <p class="soz-error">{{ error() }}</p>
              }

              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Подать заявку и пройти скоринг
                }
              </button>
              <p class="soz-hint">
                После подачи платформа мгновенно запросит данные в АИС КР (мок) и вынесет решение.
              </p>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card class="soz-apply-preview-card">
          <mat-card-header>
            <mat-card-title>Предварительный расчёт</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (preview(); as p) {
              <div class="soz-preview-summary">
                <div><span>Ежемесячный платёж</span><strong>{{ p.monthlyPayment }} BYN</strong></div>
                <div><span>Полная сумма выплат</span><strong>{{ p.totalPayable }} BYN</strong></div>
                <div><span>Переплата</span><strong>{{ p.totalInterest }} BYN</strong></div>
                <div><span>ПСК (годовых)</span><strong>{{ p.fullCostOfCreditPercent }}%</strong></div>
              </div>
              <p class="soz-hint">{{ p.note }}</p>
              <soz-schedule-table [rows]="p.schedule" [displayedColumns]="['no', 'dueDate', 'principal', 'interest', 'total']" />
            } @else {
              <p class="soz-hint">Введите сумму и срок, чтобы увидеть расчёт.</p>
            }
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .soz-apply-layout {
        display: grid;
        grid-template-columns: minmax(280px, 380px) 1fr;
        gap: 16px;
      }
      @media (max-width: 900px) {
        .soz-apply-layout {
          grid-template-columns: 1fr;
        }
      }
      .soz-form {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      mat-slider {
        width: 100%;
        margin-bottom: 12px;
      }
      .soz-hint {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-error {
        color: #b3261e;
        font-size: 13px;
      }
      .soz-preview-summary {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }
      .soz-preview-summary div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .soz-preview-summary span {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class ApplyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<CalculatePreviewResult | null>(null);

  readonly form = this.fb.nonNullable.group({
    amountByn: [1000, [Validators.required, Validators.min(100), Validators.max(7500)]],
    termMonths: [6, [Validators.required, Validators.min(1), Validators.max(12)]],
    purpose: ['', [Validators.required, Validators.minLength(3)]],
  });

  constructor(
    private readonly applicationsService: LoanApplicationsService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(startWith(this.form.getRawValue()), debounceTime(300), distinctUntilChanged((a, b) => a.amountByn === b.amountByn && a.termMonths === b.termMonths))
      .subscribe(({ amountByn, termMonths }) => {
        if (!amountByn || !termMonths) return;
        this.applicationsService.calculate(amountByn, termMonths).subscribe((p) => this.preview.set(p));
      });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    const { amountByn, termMonths, purpose } = this.form.getRawValue();
    this.applicationsService.create(amountByn!, termMonths!, purpose!).subscribe({
      next: (app) => {
        this.submitting.set(false);
        this.router.navigate(['/borrower/applications', app.id]);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(extractErrorMessage(err, 'Не удалось подать заявку'));
      },
    });
  }
}
