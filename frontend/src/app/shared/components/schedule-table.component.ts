import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { StatusBadgeComponent } from './status-badge.component';
import { PaymentScheduleItem, ScheduleRow } from '../../core/models/models';

@Component({
  selector: 'soz-schedule-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, StatusBadgeComponent],
  template: `
    <div class="soz-table-scroll">
    <table mat-table [dataSource]="rows" class="soz-schedule-table">
      <ng-container matColumnDef="no">
        <th mat-header-cell *matHeaderCellDef>№</th>
        <td mat-cell *matCellDef="let row">{{ row.installmentNo }}</td>
      </ng-container>
      <ng-container matColumnDef="dueDate">
        <th mat-header-cell *matHeaderCellDef>Дата платежа</th>
        <td mat-cell *matCellDef="let row">{{ row.dueDate }}</td>
      </ng-container>
      <ng-container matColumnDef="principal">
        <th mat-header-cell *matHeaderCellDef>Тело</th>
        <td mat-cell *matCellDef="let row">{{ principalOf(row) }} BYN</td>
      </ng-container>
      <ng-container matColumnDef="interest">
        <th mat-header-cell *matHeaderCellDef>Проценты</th>
        <td mat-cell *matCellDef="let row">{{ interestOf(row) }} BYN</td>
      </ng-container>
      <ng-container matColumnDef="penalty">
        <th mat-header-cell *matHeaderCellDef>Пеня</th>
        <td mat-cell *matCellDef="let row">{{ penaltyOf(row) }} BYN</td>
      </ng-container>
      <ng-container matColumnDef="total">
        <th mat-header-cell *matHeaderCellDef>Итого</th>
        <td mat-cell *matCellDef="let row"><strong>{{ totalOf(row) }} BYN</strong></td>
      </ng-container>
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Статус</th>
        <td mat-cell *matCellDef="let row">
          @if (row.status) {
            <soz-status-badge [status]="row.status" />
          } @else {
            <span class="soz-muted">—</span>
          }
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
    </table>
    </div>
  `,
  styles: [
    `
      .soz-table-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .soz-schedule-table {
        width: 100%;
        min-width: 560px;
      }
    `,
  ],
})
export class ScheduleTableComponent {
  @Input({ required: true }) rows: (PaymentScheduleItem | ScheduleRow)[] = [];
  @Input() displayedColumns = ['no', 'dueDate', 'principal', 'interest', 'penalty', 'total', 'status'];

  principalOf(row: PaymentScheduleItem | ScheduleRow): number {
    return 'principalDue' in row ? row.principalDue : row.principalDueByn;
  }
  interestOf(row: PaymentScheduleItem | ScheduleRow): number {
    return 'interestDue' in row ? row.interestDue : row.interestDueByn;
  }
  penaltyOf(row: PaymentScheduleItem | ScheduleRow): number {
    return 'penaltyDueByn' in row ? row.penaltyDueByn : 0;
  }
  totalOf(row: PaymentScheduleItem | ScheduleRow): number {
    return 'totalDue' in row ? row.totalDue : row.totalDueByn;
  }
}
