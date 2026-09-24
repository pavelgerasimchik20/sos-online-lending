import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { extractErrorMessage } from '../../core/utils/error-message';

export interface OtpResponse {
  devCode?: string;
  expiresInSeconds: number;
}

/**
 * Мок-подпись ОТП: запрашивает код на свой номер при открытии, даёт ввести
 * его и подтвердить. Переиспользуется и инвестором (подписание предложения),
 * и заёмщиком (подтверждение получения денег) — родитель передаёт функцию
 * запроса кода и слушает событие подтверждения с введённым кодом.
 */
@Component({
  selector: 'soz-otp-confirm',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="soz-otp-box">
      <p class="soz-otp-title"><mat-icon inline>sms</mat-icon> {{ title }}</p>
      @if (requesting()) {
        <p class="soz-otp-hint">Отправляем код...</p>
      } @else if (devCode()) {
        <p class="soz-dev-hint">
          <mat-icon inline>info</mat-icon>
          Демо-режим: код подтверждения — <strong>{{ devCode() }}</strong>
        </p>
      }
      <div class="soz-otp-row">
        <mat-form-field appearance="outline" class="soz-otp-field">
          <mat-label>Код из SMS</mat-label>
          <input matInput [(ngModel)]="code" maxlength="6" inputmode="numeric" [disabled]="requesting()" />
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="confirm()" [disabled]="code.length !== 6 || confirming() || requesting()">
          @if (confirming()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            <ng-container><mat-icon>check</mat-icon> Подписать</ng-container>
          }
        </button>
        <button mat-button type="button" (click)="cancelled.emit()" [disabled]="confirming()">Отмена</button>
      </div>
      @if (error()) {
        <p class="soz-otp-error">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .soz-otp-box {
        padding: 14px 16px;
        border-radius: 12px;
        background: var(--mat-sys-surface-container-highest, #f1f1f1);
      }
      .soz-otp-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        font-size: 13px;
        margin: 0 0 6px;
      }
      .soz-otp-hint {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-dev-hint {
        background: #fff3cd;
        color: #664d03;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 8px;
      }
      .soz-otp-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        flex-wrap: wrap;
      }
      .soz-otp-field {
        width: 130px;
      }
      .soz-otp-error {
        color: #b3261e;
        font-size: 12px;
        margin-top: 4px;
      }
    `,
  ],
})
export class OtpConfirmComponent implements OnInit {
  @Input() title = 'Подпишите договор ОТП-кодом';
  @Input({ required: true }) requestFn!: () => Observable<OtpResponse>;
  @Input({ required: true }) confirmFn!: (code: string) => Observable<unknown>;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  code = '';
  readonly requesting = signal(false);
  readonly confirming = signal(false);
  readonly devCode = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.requesting.set(true);
    this.requestFn().subscribe({
      next: (r) => {
        this.requesting.set(false);
        this.devCode.set(r.devCode ?? null);
      },
      error: (err) => {
        this.requesting.set(false);
        this.error.set(extractErrorMessage(err, 'Не удалось отправить код подтверждения'));
      },
    });
  }

  confirm(): void {
    if (this.code.length !== 6) return;
    this.confirming.set(true);
    this.error.set(null);
    this.confirmFn(this.code).subscribe({
      next: () => {
        this.confirming.set(false);
        this.confirmed.emit();
      },
      error: (err) => {
        this.confirming.set(false);
        this.error.set(extractErrorMessage(err, 'Не удалось подтвердить код'));
      },
    });
  }
}
