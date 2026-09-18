import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService } from '../../core/services/admin.service';
import {
  AdminDashboard,
  AdminUser,
  DefaultCase,
  Profile,
  SmsMessage,
  UserRole,
  UserStatus,
} from '../../core/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { extractErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'soz-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    StatusBadgeComponent,
  ],
  template: `
    <div class="soz-page">
      <h1>Панель администратора</h1>

      @if (dashboard(); as d) {
        <div class="soz-card-grid soz-metrics">
          <mat-card class="soz-money-card"><mat-card-content><mat-icon class="soz-tile-icon">group</mat-icon><span class="soz-metric-label">Пользователей</span><div class="soz-metric-value">{{ d.usersTotal }}</div></mat-card-content></mat-card>
          <mat-card class="soz-money-card"><mat-card-content><mat-icon class="soz-tile-icon">balance</mat-icon><span class="soz-metric-label">Заёмщиков / инвесторов</span><div class="soz-metric-value">{{ d.usersByRole.borrowers }} / {{ d.usersByRole.lenders }}</div></mat-card-content></mat-card>
          <mat-card class="soz-money-card"><mat-card-content><mat-icon class="soz-tile-icon">gavel</mat-icon><span class="soz-metric-label">Открытых дел взыскания</span><div class="soz-metric-value">{{ d.openCollectionCases }}</div></mat-card-content></mat-card>
          <mat-card class="soz-money-card"><mat-card-content><mat-icon class="soz-tile-icon">account_balance</mat-icon><span class="soz-metric-label">Портфель (остаток долга)</span><div class="soz-metric-value">{{ d.outstandingPortfolioByn }} BYN</div></mat-card-content></mat-card>
        </div>

        <div class="soz-card-grid soz-status-breakdown">
          <mat-card>
            <mat-card-header><mat-card-title>Заявки по статусам</mat-card-title></mat-card-header>
            <mat-card-content>
              @for (entry of objectEntries(d.applicationsByStatus); track entry[0]) {
                <p><soz-status-badge [status]="entry[0]" /> — {{ entry[1] }}</p>
              }
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-header><mat-card-title>Займы по статусам</mat-card-title></mat-card-header>
            <mat-card-content>
              @for (entry of objectEntries(d.loansByStatus); track entry[0]) {
                <p><soz-status-badge [status]="entry[0]" /> — {{ entry[1] }}</p>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }

      <mat-tab-group class="soz-admin-tabs">
        <mat-tab label="Пользователи">
          <div class="soz-users-toolbar">
            <button mat-raised-button color="primary" (click)="showCreateForm.set(!showCreateForm())">
              <mat-icon>person_add</mat-icon> Добавить пользователя
            </button>
          </div>

          @if (showCreateForm()) {
            <mat-card class="soz-create-user-card soz-reveal">
              <form [formGroup]="createForm" (ngSubmit)="createUser()" class="soz-create-user-form">
                <mat-form-field appearance="outline">
                  <mat-label>Телефон (+375...) или логин</mat-label>
                  <input matInput formControlName="login" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Пароль</mat-label>
                  <input matInput formControlName="password" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Роли</mat-label>
                  <mat-select formControlName="roles" multiple>
                    <mat-option [value]="Role.BORROWER">Заёмщик</mat-option>
                    <mat-option [value]="Role.LENDER">Инвестор</mat-option>
                    <mat-option [value]="Role.ADMIN">Администратор</mat-option>
                  </mat-select>
                </mat-form-field>
                <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid">
                  Создать
                </button>
              </form>
            </mat-card>
          }

          @if (users().length === 0) {
            <p class="soz-empty">Пользователей нет.</p>
          } @else {
            <div class="soz-table-scroll">
            <table mat-table [dataSource]="users()" class="soz-admin-table">
              <ng-container matColumnDef="login">
                <th mat-header-cell *matHeaderCellDef>Логин</th>
                <td mat-cell *matCellDef="let u">{{ u.phone ?? u.username }}</td>
              </ng-container>
              <ng-container matColumnDef="roles">
                <th mat-header-cell *matHeaderCellDef>Роли</th>
                <td mat-cell *matCellDef="let u">
                  <mat-select
                    class="soz-role-select"
                    multiple
                    [value]="u.roles"
                    (selectionChange)="updateRoles(u.id, $event.value)"
                  >
                    <mat-option [value]="Role.BORROWER">Заёмщик</mat-option>
                    <mat-option [value]="Role.LENDER">Инвестор</mat-option>
                    <mat-option [value]="Role.ADMIN">Администратор</mat-option>
                  </mat-select>
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Статус</th>
                <td mat-cell *matCellDef="let u"><soz-status-badge [status]="u.status" /></td>
              </ng-container>
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Регистрация</th>
                <td mat-cell *matCellDef="let u">{{ u.createdAt | date: 'dd.MM.yyyy' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let u">
                  @if (u.status === Status.ACTIVE) {
                    <button mat-icon-button color="warn" title="Заблокировать" (click)="block(u.id)">
                      <mat-icon>lock</mat-icon>
                    </button>
                  } @else {
                    <button mat-icon-button color="primary" title="Разблокировать" (click)="unblock(u.id)">
                      <mat-icon>lock_open</mat-icon>
                    </button>
                  }
                  <button mat-icon-button color="warn" title="Удалить" (click)="deleteUser(u.id)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="userColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: userColumns"></tr>
            </table>
            </div>
          }
        </mat-tab>

        <mat-tab label="Очередь KYC">
          @if (kycQueue().length === 0) {
            <p class="soz-empty">Анкет нет.</p>
          } @else {
            <div class="soz-table-scroll">
            <table mat-table [dataSource]="kycQueue()" class="soz-admin-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>ФИО</th>
                <td mat-cell *matCellDef="let p">{{ p.lastName }} {{ p.firstName }} {{ p.patronymic }}</td>
              </ng-container>
              <ng-container matColumnDef="inn">
                <th mat-header-cell *matHeaderCellDef>ИНН</th>
                <td mat-cell *matCellDef="let p">{{ p.inn }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Статус KYC</th>
                <td mat-cell *matCellDef="let p"><soz-status-badge [status]="p.kycStatus" /></td>
              </ng-container>
              <ng-container matColumnDef="msi">
                <th mat-header-cell *matHeaderCellDef>МСИ</th>
                <td mat-cell *matCellDef="let p"><soz-status-badge [status]="p.msiStatus" /></td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let p">
                  <button mat-button color="primary" (click)="review(p.id, 'approve')">Одобрить</button>
                  <button mat-button color="warn" (click)="review(p.id, 'reject')">Отклонить</button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="kycColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: kycColumns"></tr>
            </table>
            </div>
          }
        </mat-tab>

        <mat-tab label="Дела взыскания">
          @if (collectionCases().length === 0) {
            <p class="soz-empty">Открытых дел нет.</p>
          } @else {
            <div class="soz-table-scroll">
            <table mat-table [dataSource]="collectionCases()" class="soz-admin-table">
              <ng-container matColumnDef="loan">
                <th mat-header-cell *matHeaderCellDef>Заём</th>
                <td mat-cell *matCellDef="let c">{{ c.loanId.slice(0, 8) }}</td>
              </ng-container>
              <ng-container matColumnDef="stage">
                <th mat-header-cell *matHeaderCellDef>Стадия</th>
                <td mat-cell *matCellDef="let c"><soz-status-badge [status]="c.stage" /></td>
              </ng-container>
              <ng-container matColumnDef="days">
                <th mat-header-cell *matHeaderCellDef>Дней просрочки</th>
                <td mat-cell *matCellDef="let c">{{ c.maxDaysOverdue }}</td>
              </ng-container>
              <ng-container matColumnDef="opened">
                <th mat-header-cell *matHeaderCellDef>Открыто</th>
                <td mat-cell *matCellDef="let c">{{ c.openedAt | date: 'dd.MM.yyyy' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="caseColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: caseColumns"></tr>
            </table>
            </div>
          }
        </mat-tab>

        <mat-tab label="Лог SMS">
          @if (smsLog().length === 0) {
            <p class="soz-empty">Сообщений пока нет.</p>
          } @else {
            <div class="soz-table-scroll">
            <table mat-table [dataSource]="smsLog()" class="soz-admin-table">
              <ng-container matColumnDef="phone">
                <th mat-header-cell *matHeaderCellDef>Телефон</th>
                <td mat-cell *matCellDef="let m">{{ m.phone }}</td>
              </ng-container>
              <ng-container matColumnDef="template">
                <th mat-header-cell *matHeaderCellDef>Шаблон</th>
                <td mat-cell *matCellDef="let m">{{ m.template }}</td>
              </ng-container>
              <ng-container matColumnDef="body">
                <th mat-header-cell *matHeaderCellDef>Текст</th>
                <td mat-cell *matCellDef="let m">{{ m.body }}</td>
              </ng-container>
              <ng-container matColumnDef="sentAt">
                <th mat-header-cell *matHeaderCellDef>Отправлено</th>
                <td mat-cell *matCellDef="let m">{{ m.createdAt | date: 'dd.MM.yyyy HH:mm' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="smsColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: smsColumns"></tr>
            </table>
            </div>
          }
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .soz-metrics {
        margin-bottom: 16px;
      }
      .soz-tile-icon {
        color: var(--soz-money-green);
        display: block;
        margin-bottom: 4px;
      }
      .soz-metric-label {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-metric-value {
        font-size: 22px;
        font-weight: 600;
      }
      .soz-status-breakdown {
        margin-bottom: 24px;
      }
      .soz-admin-tabs {
        margin-top: 16px;
      }
      .soz-table-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin-top: 12px;
      }
      .soz-admin-table {
        width: 100%;
        min-width: 640px;
      }
      .soz-empty {
        padding: 16px 0;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-users-toolbar {
        margin: 12px 0;
      }
      .soz-create-user-card {
        margin-bottom: 16px;
        padding: 8px;
      }
      .soz-create-user-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-start;
      }
      .soz-create-user-form mat-form-field {
        min-width: 200px;
      }
      .soz-role-select {
        font-size: 13px;
        min-width: 160px;
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly Role = UserRole;
  readonly Status = UserStatus;

  readonly dashboard = signal<AdminDashboard | null>(null);
  readonly kycQueue = signal<Profile[]>([]);
  readonly collectionCases = signal<DefaultCase[]>([]);
  readonly smsLog = signal<SmsMessage[]>([]);
  readonly users = signal<AdminUser[]>([]);
  readonly showCreateForm = signal(false);

  readonly kycColumns = ['name', 'inn', 'status', 'msi', 'actions'];
  readonly caseColumns = ['loan', 'stage', 'days', 'opened'];
  readonly smsColumns = ['phone', 'template', 'body', 'sentAt'];
  readonly userColumns = ['login', 'roles', 'status', 'createdAt', 'actions'];

  readonly createForm = this.fb.nonNullable.group({
    login: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(4)]],
    roles: this.fb.nonNullable.control<UserRole[]>([UserRole.BORROWER], Validators.required),
  });

  constructor(
    private readonly adminService: AdminService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.adminService.dashboard().subscribe((d) => this.dashboard.set(d));
    this.adminService.kycQueue().subscribe((q) => this.kycQueue.set(q));
    this.adminService.openCollectionCases().subscribe((c) => this.collectionCases.set(c));
    this.adminService.smsLog().subscribe((s) => this.smsLog.set(s));
    this.adminService.listUsers().subscribe((u) => this.users.set(u));
  }

  review(profileId: string, decision: 'approve' | 'reject'): void {
    this.adminService.reviewKyc(profileId, decision).subscribe(() => {
      this.snackBar.open('Решение по KYC сохранено', 'ОК', { duration: 3000 });
      this.load();
    });
  }

  createUser(): void {
    if (this.createForm.invalid) return;
    this.adminService.createUser(this.createForm.getRawValue()).subscribe({
      next: () => {
        this.snackBar.open('Пользователь создан', 'ОК', { duration: 3000 });
        this.showCreateForm.set(false);
        this.createForm.reset({ login: '', password: '', roles: [UserRole.BORROWER] });
        this.load();
      },
      error: (err) => {
        this.snackBar.open(extractErrorMessage(err, 'Не удалось создать пользователя'), 'ОК', { duration: 4000 });
      },
    });
  }

  block(id: string): void {
    this.adminService.blockUser(id).subscribe({
      next: () => this.load(),
      error: (err) => this.snackBar.open(extractErrorMessage(err, 'Не удалось заблокировать'), 'ОК', { duration: 4000 }),
    });
  }

  unblock(id: string): void {
    this.adminService.unblockUser(id).subscribe(() => this.load());
  }

  updateRoles(id: string, roles: UserRole[]): void {
    this.adminService.updateRoles(id, roles).subscribe({
      next: () => this.load(),
      error: (err) => this.snackBar.open(extractErrorMessage(err, 'Не удалось изменить роли'), 'ОК', { duration: 4000 }),
    });
  }

  deleteUser(id: string): void {
    if (!confirm('Удалить пользователя безвозвратно?')) return;
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.snackBar.open('Пользователь удалён', 'ОК', { duration: 3000 });
        this.load();
      },
      error: (err) => this.snackBar.open(extractErrorMessage(err, 'Не удалось удалить'), 'ОК', { duration: 4000 }),
    });
  }

  objectEntries(obj: Record<string, number>): [string, number][] {
    return Object.entries(obj);
  }
}
