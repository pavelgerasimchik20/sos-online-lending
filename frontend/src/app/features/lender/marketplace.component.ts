import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MarketplaceService } from '../../core/services/marketplace.service';
import { MarketplaceListing } from '../../core/models/models';

@Component({
  selector: 'soz-marketplace',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="soz-page">
      <div class="soz-header-row">
        <div>
          <h1>Маркетплейс заявок</h1>
          <p class="soz-subtle">Каждая заявка финансируется одним инвестором целиком — вы получаете 100% дохода по займу</p>
        </div>
        <a mat-button routerLink="/lender">← Кабинет инвестора</a>
      </div>
      <p class="soz-hint">
        <mat-icon inline>shield</mat-icon>
        Данные о заёмщике обезличены. Указаны только скоринговый грейд, сумма, срок, ставка и цель займа.
      </p>

      @if (listings().length === 0) {
        <p class="soz-empty">Сейчас нет заявок, открытых для финансирования.</p>
      } @else {
        <div class="soz-listing-list">
          @for (listing of listings(); track listing.applicationId) {
            <mat-card class="soz-listing-row soz-money-card">
              <div class="soz-grade-badge" [class]="'soz-grade-' + listing.grade">{{ listing.grade }}</div>

              <div class="soz-listing-main">
                <div class="soz-listing-borrower">
                  <mat-icon class="soz-borrower-icon">account_circle</mat-icon>
                  <span>{{ listing.borrowerMaskedName ?? 'Заёмщик' }}</span>
                </div>
                <div class="soz-listing-amount">{{ listing.approvedAmountByn }} BYN</div>
                <div class="soz-listing-purpose">{{ listing.purpose }}</div>
              </div>

              <div class="soz-listing-stats">
                <div><mat-icon>schedule</mat-icon><span>{{ listing.approvedTermMonths }} мес.</span></div>
                <div><mat-icon>percent</mat-icon><span>{{ listing.annualRatePercent }}% годовых</span></div>
                <div><mat-icon>person</mat-icon><span>1 инвестор</span></div>
                @if (listing.fundingDeadline) {
                  <div><mat-icon>event</mat-icon><span>до {{ listing.fundingDeadline | date: 'dd.MM.yyyy HH:mm' }}</span></div>
                }
                @if (listing.borrowerStats; as bs) {
                  <div><mat-icon>handshake</mat-icon><span>{{ bs.dealsCount }} сделок, {{ bs.defaultedCount }} невыплат</span></div>
                }
              </div>

              <button mat-raised-button color="accent" class="soz-fund-btn" (click)="invest(listing)">
                <mat-icon>bolt</mat-icon>
                Профинансировать за {{ listing.remainingAmountByn }} BYN
              </button>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .soz-header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .soz-subtle {
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
        margin-top: 2px;
        max-width: 480px;
      }
      .soz-hint {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 16px;
      }
      .soz-empty {
        padding: 24px 0;
      }
      .soz-listing-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .soz-listing-row {
        position: relative;
        overflow: visible;
        display: flex !important;
        flex-direction: row !important;
        align-items: center;
        gap: 20px;
        padding: 14px 20px;
        flex-wrap: wrap;
      }
      .soz-grade-badge {
        flex: 0 0 auto;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        color: white;
        background: #16a34a;
        box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.3);
      }
      .soz-grade-D,
      .soz-grade-E {
        background: #ca8a04;
      }
      .soz-listing-main {
        flex: 1 1 220px;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .soz-listing-borrower {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-borrower-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .soz-listing-amount {
        font-size: 22px;
        font-weight: 800;
        color: var(--soz-money-green-dark);
      }
      .soz-listing-purpose {
        font-size: 13px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-listing-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
        flex: 1 1 220px;
      }
      .soz-listing-stats div {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-listing-stats mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      .soz-fund-btn {
        flex: 0 0 auto;
        height: 42px;
        white-space: nowrap;
      }
      @media (max-width: 720px) {
        .soz-listing-row {
          flex-direction: column !important;
          align-items: stretch;
        }
        .soz-listing-main,
        .soz-listing-stats {
          flex: 0 1 auto;
        }
        .soz-fund-btn {
          width: 100%;
        }
      }
    `,
  ],
})
export class MarketplaceComponent implements OnInit {
  readonly listings = signal<MarketplaceListing[]>([]);

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.marketplaceService.listListings().subscribe((listings) => this.listings.set(listings));
  }

  invest(listing: MarketplaceListing): void {
    this.router.navigateByUrl(`/lender/invest/${listing.applicationId}`);
  }
}
