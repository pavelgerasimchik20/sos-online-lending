import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MarketplaceService } from '../../core/services/marketplace.service';
import { ContractData } from '../../core/models/models';
import { extractErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'soz-contract',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="soz-page soz-printable">
      @if (data(); as d) {
        <div class="soz-toolbar-row soz-no-print">
          <a routerLink="/" class="soz-back">← На главную</a>
          <button mat-raised-button color="primary" (click)="print()">
            <mat-icon>print</mat-icon> Печать / сохранить как PDF
          </button>
        </div>

        <div class="soz-contract">
          <h1>Договор займа № {{ d.applicationId.slice(0, 8) }}</h1>
          <p class="soz-place-date">г. Минск, {{ d.createdAt | date: 'dd.MM.yyyy' }}</p>

          <p>
            <strong>Займодавец</strong> — {{ fullName(d.lender) }}, {{ d.lender.birthDate | date: 'dd.MM.yyyy' }} г.р.,
            паспорт {{ d.lender.passportSeries }}{{ d.lender.passportNumber }}, выдан {{ d.lender.passportIssuedBy }}
            {{ d.lender.passportIssuedDate | date: 'dd.MM.yyyy' }}, личный номер {{ d.lender.inn }},
            зарегистрирован(а) по адресу: {{ d.lender.registrationAddress }},
          </p>
          <p>
            и <strong>Заёмщик</strong> — {{ fullName(d.borrower) }}, {{ d.borrower.birthDate | date: 'dd.MM.yyyy' }} г.р.,
            паспорт {{ d.borrower.passportSeries }}{{ d.borrower.passportNumber }}, выдан {{ d.borrower.passportIssuedBy }}
            {{ d.borrower.passportIssuedDate | date: 'dd.MM.yyyy' }}, личный номер {{ d.borrower.inn }},
            зарегистрирован(а) по адресу: {{ d.borrower.registrationAddress }},
          </p>
          <p>
            именуемые вместе «Стороны», а по отдельности «Сторона», в рамках платформы SOS (Сервис
            онлайн-заимствования) заключили настоящий Договор о нижеследующем:
          </p>

          <h2>1. Предмет договора</h2>
          <p>
            1.1. Займодавец передаёт Заёмщику в собственность денежные средства в сумме
            <strong>{{ d.amountByn }} BYN</strong> (далее — «Заём»), а Заёмщик обязуется возвратить Займодавцу
            такую же сумму и уплатить проценты за пользование Займом из расчёта
            <strong>{{ d.annualRatePercent }}% годовых</strong> в срок до истечения
            <strong>{{ d.termMonths }} мес.</strong> с даты предоставления Займа.
          </p>
          <p>1.2. Цель использования Займа: {{ d.purpose }}.</p>
          <p>
            1.3. Процентная ставка зафиксирована на дату заключения настоящего Договора на основании
            автоматизированной скоринговой оценки платформы и изменению в одностороннем порядке не подлежит.
          </p>

          <h2>2. Порядок предоставления и возврата займа</h2>
          <p>
            2.1. Сумма Займа перечисляется Заёмщику через систему ЕРИП после подтверждения Заёмщиком
            настоящих условий в личном кабинете платформы.
          </p>
          <p>
            2.2. Возврат Займа и уплата процентов производятся аннуитетными платежами согласно графику
            платежей (Приложение № 1 к настоящему Договору), являющемуся неотъемлемой частью Договора.
          </p>
          <p>2.3. Заёмщик вправе досрочно погасить Заём полностью или частично без штрафных санкций.</p>

          <h2>3. Ответственность сторон</h2>
          <p>
            3.1. В случае просрочки платежа Займодавец вправе начислить пеню в размере, установленном
            действующими тарифами платформы SOS на дату просрочки, но не более предельного размера,
            установленного законодательством Республики Беларусь.
          </p>
          <p>
            3.2. При систематическом нарушении сроков платежей Займодавец вправе обратиться за взысканием
            задолженности в порядке, предусмотренном законодательством.
          </p>

          <h2>4. Реквизиты и подписи сторон</h2>
          <div class="soz-signatures">
            <div>
              <strong>Займодавец:</strong>
              <p>{{ fullName(d.lender) }}</p>
              @if (d.lenderSignedAt) {
                <p class="soz-signed-line">✓ Подписано ОТП {{ d.lenderSignedAt | date: 'dd.MM.yyyy HH:mm' }}</p>
              } @else {
                <p class="soz-sign-line">Подпись: _______________</p>
              }
            </div>
            <div>
              <strong>Заёмщик:</strong>
              <p>{{ fullName(d.borrower) }}</p>
              @if (d.borrowerSignedAt) {
                <p class="soz-signed-line">✓ Подписано ОТП {{ d.borrowerSignedAt | date: 'dd.MM.yyyy HH:mm' }}</p>
              } @else {
                <p class="soz-sign-line">Подпись: _______________</p>
              }
            </div>
          </div>

          <h2>Приложение № 1. График платежей</h2>
          <table class="soz-contract-schedule">
            <thead>
              <tr>
                <th>№</th>
                <th>Дата платежа</th>
                <th>Тело займа, BYN</th>
                <th>Проценты, BYN</th>
                <th>Итого, BYN</th>
              </tr>
            </thead>
            <tbody>
              @for (row of d.schedule; track row.installmentNo) {
                <tr>
                  <td>{{ row.installmentNo }}</td>
                  <td>{{ row.dueDate | date: 'dd.MM.yyyy' }}</td>
                  <td>{{ row.principalDue }}</td>
                  <td>{{ row.interestDue }}</td>
                  <td>{{ row.totalDue }}</td>
                </tr>
              }
            </tbody>
          </table>

          <p class="soz-disclaimer">
            ⚠️ Документ сформирован автоматически платформой SOS в демонстрационных целях на основании
            данных, указанных Сторонами в личных кабинетах. Он не является юридически подписанным
            документом до его подписания Сторонами усиленной квалифицированной электронной подписью или
            иным способом, предусмотренным законодательством Республики Беларусь.
          </p>
        </div>
      } @else if (error()) {
        <p class="soz-error soz-no-print">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .soz-toolbar-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .soz-back {
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-contract {
        max-width: 780px;
        margin: 0 auto;
        line-height: 1.6;
        font-size: 14px;
      }
      .soz-contract h1 {
        text-align: center;
        font-size: 20px;
        margin-bottom: 4px;
      }
      .soz-place-date {
        text-align: center;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 20px;
      }
      .soz-contract h2 {
        font-size: 15px;
        margin-top: 24px;
        margin-bottom: 8px;
      }
      .soz-signatures {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-top: 12px;
      }
      .soz-sign-line {
        margin-top: 32px;
      }
      .soz-signed-line {
        margin-top: 32px;
        color: var(--soz-money-green-dark, #065f46);
        font-weight: 600;
      }
      .soz-contract-schedule {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        margin-top: 8px;
      }
      .soz-contract-schedule th,
      .soz-contract-schedule td {
        border: 1px solid #ccc;
        padding: 6px 8px;
        text-align: right;
      }
      .soz-contract-schedule th:nth-child(1),
      .soz-contract-schedule td:nth-child(1),
      .soz-contract-schedule th:nth-child(2),
      .soz-contract-schedule td:nth-child(2) {
        text-align: left;
      }
      .soz-disclaimer {
        margin-top: 28px;
        padding: 12px 14px;
        border-radius: 10px;
        background: var(--mat-sys-surface-container-highest, #f1f1f1);
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .soz-error {
        color: #b3261e;
      }

      /* Печать/PDF: строго один лист A4, книжная ориентация. */
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      @media print {
        .soz-no-print {
          display: none !important;
        }
        .soz-page {
          padding: 0;
          max-width: none;
        }
        .soz-contract {
          max-width: none;
          font-size: 9px;
          line-height: 1.32;
        }
        .soz-contract h1 {
          font-size: 15px;
          margin: 0 0 2px;
        }
        .soz-place-date {
          margin-bottom: 8px;
        }
        .soz-contract p {
          margin: 3px 0;
        }
        .soz-contract h2 {
          font-size: 10.5px;
          margin: 8px 0 4px;
        }
        .soz-signatures {
          gap: 16px;
          margin-top: 6px;
        }
        .soz-sign-line,
        .soz-signed-line {
          margin-top: 16px;
        }
        .soz-contract-schedule {
          font-size: 8.5px;
          margin-top: 4px;
        }
        .soz-contract-schedule th,
        .soz-contract-schedule td {
          padding: 2px 5px;
        }
        .soz-disclaimer {
          margin-top: 10px;
          padding: 6px 8px;
          font-size: 7.5px;
          background: none;
          border: 1px solid #999;
        }
      }
    `,
  ],
})
export class ContractComponent implements OnInit {
  readonly data = signal<ContractData | null>(null);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  ngOnInit(): void {
    const commitmentId = this.route.snapshot.paramMap.get('commitmentId')!;
    this.marketplaceService.getContract(commitmentId).subscribe({
      next: (d) => this.data.set(d),
      error: (err) => this.error.set(extractErrorMessage(err, 'Не удалось загрузить договор')),
    });
  }

  fullName(p: { lastName: string; firstName: string; patronymic?: string }): string {
    return [p.lastName, p.firstName, p.patronymic].filter(Boolean).join(' ');
  }

  print(): void {
    window.print();
  }
}
