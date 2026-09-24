import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { tap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MarketplaceService } from '../../core/services/marketplace.service';
import { MarketplaceListing } from '../../core/models/models';
import { extractErrorMessage } from '../../core/utils/error-message';
import { OtpConfirmComponent } from '../../shared/components/otp-confirm.component';

@Component({
  selector: 'soz-invest',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, OtpConfirmComponent],
  template: `
    <div class="soz-page soz-invest-page">
      <a routerLink="/lender/marketplace" class="soz-back">← К маркетплейсу</a>

      @if (listing(); as l) {
        <h1>Профинансировать заявку</h1>

        <mat-card class="soz-money-card soz-borrower-card">
          <mat-card-header>
            <mat-card-title>{{ l.borrowerMaskedName ?? 'Заёмщик' }}</mat-card-title>
            <mat-card-subtitle>{{ l.purpose }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="soz-terms-grid">
              <div><span>Сумма</span><strong>{{ l.approvedAmountByn }} BYN</strong></div>
              <div><span>Срок</span><strong>{{ l.approvedTermMonths }} мес.</strong></div>
              <div><span>Ставка</span><strong>{{ l.annualRatePercent }}% годовых</strong></div>
              <div><span>Грейд</span><strong>{{ l.grade }}</strong></div>
            </div>

            <h3>История заёмщика на платформе</h3>
            <div class="soz-borrower-stats">
              <div><mat-icon>handshake</mat-icon><span>Сделок всего</span><strong>{{ l.borrowerStats?.dealsCount ?? 0 }}</strong></div>
              <div><mat-icon>check_circle</mat-icon><span>Выплачено вовремя</span><strong>{{ l.borrowerStats?.paidOnTimeCount ?? 0 }}</strong></div>
              <div><mat-icon>error</mat-icon><span>Не выплачено</span><strong>{{ l.borrowerStats?.defaultedCount ?? 0 }}</strong></div>
            </div>
            <p class="soz-hint">Персональные данные заёмщика обезличены — станут доступны обеим сторонам в договоре после того, как заёмщик подтвердит ваше предложение.</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="soz-money-card soz-flow-card">
          <mat-card-header>
            <mat-card-title>Как это работает</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <ol>
              <li>Вы нажимаете «Инвестировать» и подписываете предложение ОТП-кодом на свой номер — договор сформирован, но деньги пока НЕ списаны с вашего кошелька.</li>
              <li>Заёмщик видит предложение и договор в личном кабинете — принимает (тоже подписывает ОТП-кодом) или отклоняет.</li>
              <li>Только когда заёмщик подписал — с вашего кошелька списывается сумма, деньги поступают ему, сделка становится активной и видна во вкладке «Активные сделки».</li>
              <li>Если отклонил или не ответил в срок — предложение просто закрывается, деньги никуда не резервировались.</li>
            </ol>
          </mat-card-content>
        </mat-card>

        @if (showOtp()) {
          <soz-otp-confirm
            title="Подпишите предложение инвестора ОТП-кодом"
            [requestFn]="requestOtp"
            [confirmFn]="signAndPropose(l)"
            (confirmed)="onProposed()"
            (cancelled)="showOtp.set(false)"
          />
        } @else {
          <button mat-raised-button color="accent" class="soz-invest-btn" (click)="showOtp.set(true)">
            <mat-icon>bolt</mat-icon> Инвестировать {{ l.approvedAmountByn }} BYN
          </button>
        }
      } @else if (loadError()) {
        <p class="soz-error">{{ loadError() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .soz-invest-page {
        max-width: 640px;
      }
      .soz-back {
        display: inline-block;
        margin-bottom: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-borrower-card,
      .soz-flow-card {
        margin: 16px 0;
      }
      .soz-terms-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px 16px;
        margin-bottom: 16px;
      }
      .soz-terms-grid div {
        display: flex;
        flex-direction: column;
      }
      .soz-terms-grid span {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-terms-grid strong {
        font-size: 17px;
      }
      .soz-borrower-stats {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        margin: 8px 0;
      }
      .soz-borrower-stats div {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-borrower-stats mat-icon {
        color: var(--soz-money-green);
      }
      .soz-borrower-stats strong {
        font-size: 16px;
        color: var(--mat-sys-on-surface);
      }
      .soz-hint {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 8px;
      }
      ol {
        margin: 0;
        padding-left: 20px;
        font-size: 13px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .soz-invest-btn {
        width: 100%;
        height: 48px;
        margin-top: 8px;
      }
      .soz-error {
        color: #b3261e;
        font-size: 13px;
      }
    `,
  ],
})
export class InvestComponent implements OnInit {
  readonly listing = signal<MarketplaceListing | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly showOtp = signal(false);

  private newCommitmentId: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId')!;
    this.marketplaceService.listListings().subscribe({
      next: (listings) => {
        const found = listings.find((l) => l.applicationId === applicationId);
        if (found) {
          this.listing.set(found);
        } else {
          this.loadError.set('Заявка больше не доступна для финансирования — возможно, её уже забрал другой инвестор.');
        }
      },
      error: (err) => this.loadError.set(extractErrorMessage(err, 'Не удалось загрузить заявку')),
    });
  }

  readonly requestOtp = () => this.marketplaceService.requestSignOtp();

  signAndPropose(listing: MarketplaceListing) {
    return (code: string) =>
      this.marketplaceService.propose(listing.applicationId, listing.remainingAmountByn, code).pipe(
        tap((commitment) => {
          this.newCommitmentId = commitment.id;
        }),
      );
  }

  onProposed(): void {
    if (this.newCommitmentId) {
      this.router.navigateByUrl(`/contract/${this.newCommitmentId}`);
    }
  }
}
