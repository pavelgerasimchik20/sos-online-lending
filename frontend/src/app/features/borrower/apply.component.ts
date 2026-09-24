import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoanApplicationsService } from '../../core/services/loan-applications.service';
import { CalculatePreviewResult } from '../../core/models/models';
import { ScheduleTableComponent } from '../../shared/components/schedule-table.component';
import { extractErrorMessage } from '../../core/utils/error-message';

const MIN_AMOUNT = 100;
const MAX_AMOUNT = 10000;
const MIN_TERM = 1;
const MAX_TERM = 12;

const PURPOSES = ['Ремонт квартиры', 'Покупка техники', 'Оплата обучения', 'Покупка автомобиля', 'Лечение', 'Свадьба', 'Отпуск', 'Другое'];

@Component({
  selector: 'soz-apply',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    ScheduleTableComponent,
  ],
  template: `
    <div class="soz-page soz-apply-page">
      <h1><mat-icon inline>add_circle</mat-icon> Подать заявку на заём</h1>
      <p class="soz-subtle">Заполните три поля — платформа мгновенно посчитает график и вынесет решение</p>

      <div class="soz-apply-layout">
        <mat-card class="soz-apply-form-card soz-money-card">
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" class="soz-form">
              <div class="soz-slider-block">
                <div class="soz-slider-label">
                  <span>Сумма займа</span>
                  <strong>{{ form.controls.amountByn.value }} BYN</strong>
                </div>
                <mat-slider [min]="minAmount" [max]="maxAmount" step="50" discrete>
                  <input matSliderThumb formControlName="amountByn" />
                </mat-slider>
                <mat-form-field appearance="outline" class="soz-number-field">
                  <input matInput type="number" formControlName="amountByn" />
                  <span matSuffix>BYN</span>
                </mat-form-field>
              </div>

              <div class="soz-slider-block">
                <div class="soz-slider-label">
                  <span>Срок</span>
                  <strong>{{ form.controls.termMonths.value }} мес.</strong>
                </div>
                <mat-slider [min]="minTerm" [max]="maxTerm" step="1" discrete>
                  <input matSliderThumb formControlName="termMonths" />
                </mat-slider>
                <mat-form-field appearance="outline" class="soz-number-field">
                  <input matInput type="number" formControlName="termMonths" />
                  <span matSuffix>мес.</span>
                </mat-form-field>
              </div>

              <div class="soz-purpose-block">
                <span class="soz-slider-label-plain">Цель займа</span>
                <mat-chip-listbox [(ngModel)]="selectedPurpose" [ngModelOptions]="{ standalone: true }" (change)="onPurposeChip()">
                  @for (p of purposes; track p) {
                    <mat-chip-option [value]="p">{{ p }}</mat-chip-option>
                  }
                </mat-chip-listbox>
                @if (selectedPurpose === 'Другое') {
                  <mat-form-field appearance="outline" class="soz-purpose-custom">
                    <mat-label>Опишите цель</mat-label>
                    <input matInput formControlName="purpose" placeholder="Например: пополнение оборотных средств" />
                  </mat-form-field>
                }
              </div>

              @if (error()) {
                <p class="soz-error">{{ error() }}</p>
              }

              <button mat-raised-button color="primary" type="submit" class="soz-submit-btn" [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>bolt</mat-icon> Подать заявку и пройти скоринг</ng-container>
                }
              </button>
              <p class="soz-hint">
                <mat-icon inline>info</mat-icon>
                После подачи платформа мгновенно запросит данные в АИС КР (мок) и вынесет решение.
              </p>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card class="soz-apply-preview-card soz-money-card">
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
      .soz-apply-page h1 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 2px;
      }
      .soz-subtle {
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
        margin: 0 0 20px;
      }
      .soz-apply-layout {
        display: grid;
        grid-template-columns: minmax(300px, 420px) 1fr;
        gap: 16px;
        align-items: start;
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
      .soz-slider-block {
        margin-bottom: 12px;
      }
      .soz-slider-label {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 4px;
      }
      .soz-slider-label span {
        font-size: 13px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-slider-label strong {
        font-size: 20px;
        color: var(--soz-money-green-dark);
      }
      .soz-slider-label-plain {
        display: block;
        font-size: 13px;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 6px;
      }
      mat-slider {
        width: 100%;
      }
      .soz-number-field {
        width: 140px;
      }
      .soz-purpose-block {
        margin: 12px 0 4px;
      }
      .soz-purpose-custom {
        display: block;
        margin-top: 8px;
        width: 100%;
      }
      .soz-hint {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .soz-error {
        color: #b3261e;
        font-size: 13px;
      }
      .soz-submit-btn {
        height: 46px;
        margin-top: 8px;
        margin-bottom: 4px;
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
      .soz-preview-summary strong {
        font-size: 17px;
      }
    `,
  ],
})
export class ApplyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly minAmount = MIN_AMOUNT;
  readonly maxAmount = MAX_AMOUNT;
  readonly minTerm = MIN_TERM;
  readonly maxTerm = MAX_TERM;
  readonly purposes = PURPOSES;
  selectedPurpose = PURPOSES[0];

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<CalculatePreviewResult | null>(null);

  readonly form = this.fb.nonNullable.group({
    amountByn: [1000, [Validators.required, Validators.min(MIN_AMOUNT), Validators.max(MAX_AMOUNT)]],
    termMonths: [6, [Validators.required, Validators.min(MIN_TERM), Validators.max(MAX_TERM)]],
    purpose: [PURPOSES[0], [Validators.required, Validators.minLength(3)]],
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

  onPurposeChip(): void {
    if (this.selectedPurpose !== 'Другое') {
      this.form.patchValue({ purpose: this.selectedPurpose });
    } else {
      this.form.patchValue({ purpose: '' });
    }
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
