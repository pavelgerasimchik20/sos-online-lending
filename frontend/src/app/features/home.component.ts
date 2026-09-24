import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../core/services/auth.service';
import { AdminService } from '../core/services/admin.service';
import { MarketplaceService } from '../core/services/marketplace.service';
import { BorrowerStatsRow, InvestorStatsRow, MarketplaceListing, UserRole } from '../core/models/models';

@Component({
  selector: 'soz-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="soz-home">
      <section class="soz-hero">
        <div class="soz-hero-bg" aria-hidden="true">
          <mat-icon class="soz-float-icon soz-float-1">payments</mat-icon>
          <mat-icon class="soz-float-icon soz-float-2">savings</mat-icon>
          <mat-icon class="soz-float-icon soz-float-3">account_balance</mat-icon>
          <mat-icon class="soz-float-icon soz-float-4">trending_up</mat-icon>
          <mat-icon class="soz-float-icon soz-float-5">paid</mat-icon>
        </div>

        <div class="soz-hero-inner">
          <span class="soz-hero-badge"><mat-icon inline>bolt</mat-icon> Заём онлайн за минуты</span>
          <h1>SOS — сервис онлайн-заимствования</h1>
          <p>
            Соединяем инвесторов и заёмщиков напрямую: каждая заявка финансируется одним инвестором
            целиком, деньги приходят через ЕРИП, личность подтверждается через МСИ. Прозрачно, быстро,
            по модели, приближённой к регулированию СОЗ в Республике Беларусь.
          </p>

          @if (!auth.isLoggedIn()) {
            <div class="soz-hero-actions">
              <a mat-raised-button color="primary" class="soz-cta-primary" routerLink="/register">
                <mat-icon>rocket_launch</mat-icon> Начать за 30 секунд
              </a>
              <a mat-stroked-button routerLink="/login">У меня уже есть аккаунт</a>
            </div>
          } @else {
            <div class="soz-hero-actions">
              @if (auth.hasRole(UserRole.BORROWER)) {
                <a mat-raised-button color="primary" class="soz-cta-primary" routerLink="/borrower">
                  <mat-icon>account_circle</mat-icon> Кабинет заёмщика
                </a>
              }
              @if (auth.hasRole(UserRole.LENDER)) {
                <a mat-raised-button color="accent" class="soz-cta-primary" routerLink="/lender">
                  <mat-icon>trending_up</mat-icon> Кабинет инвестора
                </a>
              }
              @if (auth.hasRole(UserRole.ADMIN)) {
                <a mat-stroked-button routerLink="/admin">Панель администратора</a>
              }
            </div>
          }
        </div>
      </section>

      <section class="soz-page soz-marketplace-section" id="marketplace">
        <div class="soz-marketplace-heading">
          <div>
            <h2 class="soz-section-title soz-marketplace-title"><mat-icon inline>storefront</mat-icon> Маркетплейс заявок</h2>
            <p class="soz-subtle">Каждая заявка финансируется одним инвестором целиком — вы получаете 100% дохода по займу</p>
          </div>
        </div>

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
                  @if (listing.borrowerStats; as bs) {
                    <div><mat-icon>handshake</mat-icon><span>{{ bs.dealsCount }} сделок, {{ bs.defaultedCount }} невыплат</span></div>
                  }
                </div>

                <button
                  mat-raised-button
                  color="accent"
                  class="soz-fund-btn"
                  (click)="onInvestClick(listing)"
                  [disabled]="becomingInvestor() === listing.applicationId"
                >
                  @if (becomingInvestor() === listing.applicationId) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <ng-container><mat-icon>bolt</mat-icon> Профинансировать за {{ listing.remainingAmountByn }} BYN</ng-container>
                  }
                </button>
              </mat-card>
            }
          </div>
        }
      </section>

      <section class="soz-page soz-stats-section">
        <div class="soz-stats-grid">
          <div class="soz-stat">
            <mat-icon>account_balance</mat-icon>
            <div class="soz-stat-value">{{ animated().fundedLoans }}</div>
            <div class="soz-stat-label">займов выдано</div>
          </div>
          <div class="soz-stat">
            <mat-icon>payments</mat-icon>
            <div class="soz-stat-value">{{ animated().totalDisbursedByn }} <span>BYN</span></div>
            <div class="soz-stat-label">выдано на руки</div>
          </div>
          <div class="soz-stat">
            <mat-icon>groups</mat-icon>
            <div class="soz-stat-value">{{ animated().activeLenders }}</div>
            <div class="soz-stat-label">активных инвесторов</div>
          </div>
          <div class="soz-stat">
            <mat-icon>check_circle</mat-icon>
            <div class="soz-stat-value">{{ animated().approvalRatePercent }}%</div>
            <div class="soz-stat-label">заявок одобряется</div>
          </div>
        </div>
      </section>

      <section class="soz-page soz-tables-section">
        <div class="soz-tables-grid">
          <div>
            <h2 class="soz-section-title soz-tables-title">Статистика заёмщиков</h2>
            <div class="soz-table-scroll">
              <table mat-table [dataSource]="borrowerStats()" class="soz-stats-table">
                <ng-container matColumnDef="maskedName">
                  <th mat-header-cell *matHeaderCellDef>Заёмщик</th>
                  <td mat-cell *matCellDef="let r">{{ r.maskedName }}</td>
                </ng-container>
                <ng-container matColumnDef="applicationsCount">
                  <th mat-header-cell *matHeaderCellDef>Заявок</th>
                  <td mat-cell *matCellDef="let r">{{ r.applicationsCount }}</td>
                </ng-container>
                <ng-container matColumnDef="activeLoansCount">
                  <th mat-header-cell *matHeaderCellDef>Активных займов</th>
                  <td mat-cell *matCellDef="let r">{{ r.activeLoansCount }}</td>
                </ng-container>
                <ng-container matColumnDef="paidOnTimeCount">
                  <th mat-header-cell *matHeaderCellDef>Выплачено вовремя</th>
                  <td mat-cell *matCellDef="let r">{{ r.paidOnTimeCount }}</td>
                </ng-container>
                <ng-container matColumnDef="defaultedCount">
                  <th mat-header-cell *matHeaderCellDef>Не выплачено</th>
                  <td mat-cell *matCellDef="let r">{{ r.defaultedCount }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="borrowerColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: borrowerColumns"></tr>
              </table>
            </div>
          </div>

          <div>
            <h2 class="soz-section-title soz-tables-title">Статистика инвесторов</h2>
            <div class="soz-table-scroll">
              <table mat-table [dataSource]="investorStats()" class="soz-stats-table">
                <ng-container matColumnDef="maskedName">
                  <th mat-header-cell *matHeaderCellDef>Инвестор</th>
                  <td mat-cell *matCellDef="let r">{{ r.maskedName }}</td>
                </ng-container>
                <ng-container matColumnDef="balanceByn">
                  <th mat-header-cell *matHeaderCellDef>Баланс, BYN</th>
                  <td mat-cell *matCellDef="let r">{{ r.balanceByn }}</td>
                </ng-container>
                <ng-container matColumnDef="totalInvestedByn">
                  <th mat-header-cell *matHeaderCellDef>Вложено, BYN</th>
                  <td mat-cell *matCellDef="let r">{{ r.totalInvestedByn }}</td>
                </ng-container>
                <ng-container matColumnDef="totalEarnedInterestByn">
                  <th mat-header-cell *matHeaderCellDef>Заработано, BYN</th>
                  <td mat-cell *matCellDef="let r">{{ r.totalEarnedInterestByn }}</td>
                </ng-container>
                <ng-container matColumnDef="dealsCount">
                  <th mat-header-cell *matHeaderCellDef>Сделок</th>
                  <td mat-cell *matCellDef="let r">{{ r.dealsCount }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="investorColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: investorColumns"></tr>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="soz-page">
        <h2 class="soz-section-title">Как это работает</h2>
        <div class="soz-card-grid">
          <mat-card class="soz-feature-card">
            <mat-card-content>
              <div class="soz-feature-head">
                <div class="soz-feature-icon"><mat-icon>badge</mat-icon></div>
                <h3>Идентификация: KYC + МСИ</h3>
              </div>
              Заполняете анкету и подтверждаете личность через Межбанковскую систему идентификации
              (МСИ) — обязательный шаг для обеих сторон сделки.
            </mat-card-content>
          </mat-card>
          <mat-card class="soz-feature-card">
            <mat-card-content>
              <div class="soz-feature-head">
                <div class="soz-feature-icon"><mat-icon>description</mat-icon></div>
                <h3>Заявка и мгновенный скоринг</h3>
              </div>
              Заёмщик подаёт заявку — платформа запрашивает данные в АИС КР (мок) и сразу
              строит скоринговую оценку, ставку и график платежей.
            </mat-card-content>
          </mat-card>
          <mat-card class="soz-feature-card">
            <mat-card-content>
              <div class="soz-feature-head">
                <div class="soz-feature-icon"><mat-icon>handshake</mat-icon></div>
                <h3>Один заём — один инвестор</h3>
              </div>
              Каждая одобренная заявка финансируется полностью одним инвестором — без дробления
              между несколькими инвесторами. Деньги выдаются заёмщику через ЕРИП (мок) мгновенно.
            </mat-card-content>
          </mat-card>
          <mat-card class="soz-feature-card">
            <mat-card-content>
              <div class="soz-feature-head">
                <div class="soz-feature-icon"><mat-icon>gavel</mat-icon></div>
                <h3>Работа с просрочкой</h3>
              </div>
              При неплатеже — пеня, SMS-напоминания, затем автоматическая досудебная претензия и
              передача дела на взыскание согласно стадиям, приближённым к законодательству РБ.
            </mat-card-content>
          </mat-card>
        </div>
      </section>

      <section class="soz-page soz-trust-section">
        <mat-card class="soz-trust-card">
          <mat-icon>verified_user</mat-icon>
          <div>
            <strong>Безопасность и прозрачность</strong>
            <p>
              Скоринг объясняет каждое решение, платежи распределяются автоматически, а обращения
              в АИС КР, ЕРИП и МСИ реализованы как заменяемые интеграции — сервис готов к
              подключению реальных провайдеров.
            </p>
          </div>
        </mat-card>
      </section>

      <p class="soz-page soz-disclaimer">
        ⚠️ Демонстрационный проект. Ставки, лимиты и сроки — иллюстративные настраиваемые
        параметры. АИС КР, ЕРИП, МСИ и SMS — мок-интеграции. Перед реальным использованием
        требуется юридическая проверка и регистрация оператора СОЗ в Национальном банке РБ.
      </p>
    </div>
  `,
  styles: [
    `
      .soz-hero {
        position: relative;
        overflow: hidden;
        text-align: center;
        padding: 56px 24px 64px;
        background: var(--soz-hero-gradient), var(--mat-sys-surface-container-low);
      }
      .soz-hero-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .soz-float-icon {
        position: absolute;
        opacity: 0.24;
        color: var(--soz-money-green);
        font-size: 48px;
        width: 48px;
        height: 48px;
      }
      .soz-float-1 {
        top: 12%;
        left: 8%;
        animation: sozFloat 7s ease-in-out infinite;
      }
      .soz-float-2 {
        top: 65%;
        left: 15%;
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--soz-money-gold);
        animation: sozFloatSlow 9s ease-in-out infinite;
      }
      .soz-float-3 {
        top: 20%;
        right: 10%;
        animation: sozFloatSlow 8s ease-in-out infinite;
      }
      .soz-float-4 {
        top: 70%;
        right: 14%;
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--soz-money-gold);
        animation: sozFloat 10s ease-in-out infinite;
      }
      .soz-float-5 {
        top: 40%;
        left: 48%;
        font-size: 30px;
        width: 30px;
        height: 30px;
        animation: sozFloatSlow 6s ease-in-out infinite;
      }
      .soz-hero-inner {
        position: relative;
        z-index: 1;
        max-width: 720px;
        margin: 0 auto;
      }
      .soz-hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
        padding: 6px 14px;
        border-radius: 999px;
        background: var(--soz-money-gradient-bold);
        color: white;
        box-shadow: 0 6px 16px -6px rgba(6, 95, 70, 0.5);
        margin-bottom: 18px;
      }
      .soz-hero h1 {
        font-size: 40px;
        margin: 0 0 16px;
        background: var(--soz-money-gradient-bold);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        line-height: 1.15;
      }
      .soz-hero p {
        max-width: 640px;
        margin: 0 auto 28px;
        color: var(--mat-sys-on-surface-variant);
        font-size: 16px;
        line-height: 1.5;
      }
      .soz-hero-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .soz-cta-primary {
        height: 46px;
        padding: 0 22px;
        font-weight: 600;
      }
      .soz-marketplace-section {
        padding-top: 40px;
      }
      .soz-marketplace-heading {
        margin-bottom: 16px;
      }
      .soz-marketplace-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
      }
      .soz-marketplace-title mat-icon {
        color: var(--soz-money-gold);
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .soz-subtle {
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
        margin-top: 4px;
      }
      .soz-empty {
        padding: 16px 0;
        color: var(--mat-sys-on-surface-variant);
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
      .soz-tables-section {
        padding-top: 8px;
      }
      .soz-tables-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 32px;
      }
      .soz-tables-title {
        margin: 0 0 12px;
        font-size: 18px;
      }
      .soz-table-scroll {
        overflow-x: auto;
        border-radius: 12px;
        background: var(--mat-sys-surface-container);
      }
      .soz-stats-table {
        width: 100%;
        min-width: 480px;
      }
      .soz-stats-section {
        padding-top: 32px;
        padding-bottom: 8px;
      }
      .soz-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 16px;
      }
      .soz-stat {
        position: relative;
        overflow: hidden;
        text-align: center;
        padding: 22px 12px;
        border-radius: 16px;
        background: var(--mat-sys-surface-container);
        animation: sozRiseIn 0.5s ease both;
        box-shadow: 0 6px 18px -10px rgba(6, 95, 70, 0.3);
      }
      .soz-stat::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--soz-money-gradient-bold);
      }
      .soz-stat mat-icon {
        color: white;
        background: var(--soz-money-gradient-bold);
        border-radius: 10px;
        padding: 6px;
        width: 24px;
        height: 24px;
        box-sizing: content-box;
        margin-bottom: 8px;
      }
      .soz-stat-value {
        font-size: 28px;
        font-weight: 800;
        background: var(--soz-money-gradient-bold);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .soz-stat-value span {
        font-size: 14px;
        font-weight: 500;
      }
      .soz-stat-label {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 2px;
      }
      .soz-section-title {
        margin: 40px 0 16px;
        font-size: 22px;
      }
      .soz-feature-card {
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }
      .soz-feature-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 14px 30px -14px rgba(15, 122, 87, 0.4);
      }
      .soz-feature-head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }
      .soz-feature-head h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .soz-feature-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--soz-money-gradient-bold);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .soz-trust-section {
        padding-top: 8px;
      }
      .soz-trust-card {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 20px 24px;
        border-left: 4px solid var(--soz-money-green);
        background: linear-gradient(120deg, rgba(14, 159, 95, 0.14), rgba(245, 158, 11, 0.12));
      }
      .soz-trust-card mat-icon {
        color: white;
        background: var(--soz-money-gradient-bold);
        border-radius: 12px;
        padding: 8px;
        box-sizing: content-box;
        font-size: 28px;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
      }
      .soz-trust-card p {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
      }
      .soz-disclaimer {
        margin-top: 16px;
        padding-top: 0;
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        text-align: center;
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  readonly UserRole = UserRole;

  readonly animated = signal({
    fundedLoans: 0,
    totalDisbursedByn: 0,
    activeLenders: 0,
    activeBorrowers: 0,
    approvalRatePercent: 0,
  });

  readonly listings = signal<MarketplaceListing[]>([]);
  readonly borrowerStats = signal<BorrowerStatsRow[]>([]);
  readonly investorStats = signal<InvestorStatsRow[]>([]);
  readonly becomingInvestor = signal<string | null>(null);

  readonly borrowerColumns = ['maskedName', 'applicationsCount', 'activeLoansCount', 'paidOnTimeCount', 'defaultedCount'];
  readonly investorColumns = ['maskedName', 'balanceByn', 'totalInvestedByn', 'totalEarnedInterestByn', 'dealsCount'];

  constructor(
    public readonly auth: AuthService,
    private readonly adminService: AdminService,
    private readonly marketplaceService: MarketplaceService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.adminService.publicStats().subscribe((stats) => this.animateTo(stats));
    this.marketplaceService.listListings().subscribe((listings) => this.listings.set(listings));
    this.adminService.publicBorrowerStats().subscribe((rows) => this.borrowerStats.set(rows));
    this.adminService.publicInvestorStats().subscribe((rows) => this.investorStats.set(rows));
  }

  onInvestClick(listing: MarketplaceListing): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/register');
      return;
    }
    if (this.auth.hasRole(UserRole.LENDER)) {
      this.router.navigateByUrl(`/lender/invest/${listing.applicationId}`);
      return;
    }
    this.becomingInvestor.set(listing.applicationId);
    this.auth.addRole(UserRole.LENDER).subscribe({
      next: () => {
        this.becomingInvestor.set(null);
        this.router.navigateByUrl(`/lender/invest/${listing.applicationId}`);
      },
      error: () => this.becomingInvestor.set(null),
    });
  }

  private animateTo(target: {
    fundedLoans: number;
    totalDisbursedByn: number;
    activeLenders: number;
    activeBorrowers: number;
    approvalRatePercent: number;
  }): void {
    const durationMs = 900;
    const start = performance.now();
    const from = this.animated();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      this.animated.set({
        fundedLoans: Math.round(from.fundedLoans + (target.fundedLoans - from.fundedLoans) * eased),
        totalDisbursedByn: Math.round(from.totalDisbursedByn + (target.totalDisbursedByn - from.totalDisbursedByn) * eased),
        activeLenders: Math.round(from.activeLenders + (target.activeLenders - from.activeLenders) * eased),
        activeBorrowers: Math.round(from.activeBorrowers + (target.activeBorrowers - from.activeBorrowers) * eased),
        approvalRatePercent: Math.round(
          from.approvalRatePercent + (target.approvalRatePercent - from.approvalRatePercent) * eased,
        ),
      });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
