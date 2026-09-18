import { Component, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentScheduleItem, ScheduleItemStatus } from '../../core/models/models';

const STATUS_COLOR: Record<string, string> = {
  PAID: '#16A34A',
  PENDING: '#2563EB',
  PARTIALLY_PAID: '#CA8A04',
  OVERDUE: '#DC2626',
};

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Оплачен',
  PENDING: 'Ожидает оплаты',
  PARTIALLY_PAID: 'Частично оплачен',
  OVERDUE: 'Просрочен',
};

@Component({
  selector: 'soz-repayment-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (items.length === 0) {
      <p class="soz-chart-empty">График появится после выдачи займа.</p>
    } @else {
      <div class="soz-legend">
        @for (key of legendKeys; track key) {
          <span class="soz-legend-item">
            <i [style.background]="colorOf(key)"></i>{{ labelOf(key) }}
          </span>
        }
      </div>
      <div class="soz-bars-wrap">
        @for (item of items; track item.id; let i = $index) {
          <div
            class="soz-bar-col"
            (mouseenter)="hoverIndex.set(i)"
            (mouseleave)="hoverIndex.set(null)"
          >
            @if (hoverIndex() === i) {
              <div class="soz-bar-tooltip">
                <div>№{{ item.installmentNo }} · {{ item.dueDate }}</div>
                <div><strong>{{ item.totalDueByn }} BYN</strong></div>
                <div>{{ labelOf(item.status) }}</div>
              </div>
            }
            <div
              class="soz-bar"
              [style.height.%]="heightPercentOf(item.totalDueByn)"
              [style.background]="colorOf(item.status)"
            ></div>
            <span class="soz-bar-label">{{ item.installmentNo }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .soz-chart-empty {
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
        padding: 16px 0;
      }
      .soz-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-legend-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .soz-legend-item i {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        display: inline-block;
      }
      .soz-bars-wrap {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        height: 160px;
        padding: 8px 4px 0;
        border-bottom: 1px solid var(--mat-sys-outline-variant, #e2e2e2);
      }
      .soz-bar-col {
        position: relative;
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        height: 100%;
        min-width: 14px;
        cursor: pointer;
      }
      .soz-bar {
        width: 100%;
        max-width: 32px;
        border-radius: 6px 6px 2px 2px;
        transition: filter 0.15s ease;
      }
      .soz-bar-col:hover .soz-bar {
        filter: brightness(1.1);
      }
      .soz-bar-label {
        font-size: 10px;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 4px;
      }
      .soz-bar-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 6px;
        background: rgba(20, 30, 25, 0.92);
        color: white;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 11px;
        white-space: nowrap;
        z-index: 3;
      }
    `,
  ],
})
export class RepaymentChartComponent implements OnChanges {
  @Input() items: PaymentScheduleItem[] = [];

  readonly hoverIndex = signal<number | null>(null);
  readonly legendKeys = Object.keys(STATUS_COLOR);
  private maxAmount = 1;

  ngOnChanges(): void {
    this.maxAmount = Math.max(1, ...this.items.map((i) => Number(i.totalDueByn)));
  }

  heightPercentOf(amount: number): number {
    return Math.max(6, (Number(amount) / this.maxAmount) * 100);
  }

  colorOf(status: string): string {
    return STATUS_COLOR[status] ?? '#9CA3AF';
  }

  labelOf(status: string): string {
    return STATUS_LABEL[status] ?? status;
  }

  protected readonly ScheduleItemStatus = ScheduleItemStatus;
}
