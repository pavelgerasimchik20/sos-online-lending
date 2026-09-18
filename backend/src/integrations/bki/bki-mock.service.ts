import { Injectable, Logger } from '@nestjs/common';
import {
  CreditBureauDelinquency,
  CreditBureauPort,
  CreditBureauReport,
} from '../interfaces/credit-bureau.port';
import { createSeededRandom, randomInt } from '../../common/deterministic-random';

/**
 * Мок бюро кредитных историй (БКИ). Возвращает детерминированный (по ИНН)
 * "кредитный отчёт" — именно этот объект имитирует ответ реального БКИ и
 * подаётся на вход ScoringModule, как если бы он был получен по факту
 * обращения оператора СОЗ в БКИ при рассмотрении заявки.
 *
 * Распределение смещено в сторону благополучной кредитной истории (как у
 * типичного клиента с более-менее чистой историей), а не 50/50 —
 * серьёзные просрочки и открытые дела о взыскании остаются возможными, но
 * редкими, а не выпадающими почти каждой второй синтетической заявке.
 */
@Injectable()
export class BkiMockService implements CreditBureauPort {
  private readonly logger = new Logger('БКИ (мок)');

  async fetchReport(inn: string, fullName: string): Promise<CreditBureauReport> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const rand = createSeededRandom(`bki:${inn}`);

    const creditHistoryMonths = randomInt(rand, 6, 96);
    const closedLoansCount = randomInt(rand, 0, 6);
    // Смещение к нулю: чаще 0-1 действующий заём, изредка 2.
    const activeLoansCount = Math.floor(3 * rand() * rand());

    let totalActiveDebtByn = 0;
    for (let i = 0; i < activeLoansCount; i++) {
      totalActiveDebtByn += randomInt(rand, 200, 3000);
    }

    // Просрочки — редкое событие: ~70% чистая история, тяжёлые просрочки — редкость.
    const delinquencyBuckets = [0, 0, 0, 0, 0, 0, 0, 5, 15, 30, 60, 90];
    const worstDelinquencyDaysEver = pickWorst(rand, delinquencyBuckets);
    const delinquenciesLast12Months = worstDelinquencyDaysEver > 0 ? randomInt(rand, 1, 2) : 0;

    const delinquencyHistory: CreditBureauDelinquency[] = [];
    if (worstDelinquencyDaysEver > 0) {
      const historyEntries = randomInt(rand, 1, 2);
      for (let i = 0; i < historyEntries; i++) {
        delinquencyHistory.push({
          loanIssuedYear: new Date().getFullYear() - randomInt(rand, 1, 5),
          worstDelinquencyDays: delinquencyBuckets[randomInt(rand, 0, delinquencyBuckets.length - 1)],
        });
      }
    }

    // Утилизация лимитов смещена к более низким значениям.
    const creditLimitUtilizationRatio = Math.round(rand() * rand() * 100) / 100;
    const hasActiveCollectionCase = worstDelinquencyDaysEver >= 90 && rand() > 0.85;

    this.logger.log(`Запрос кредитного отчёта: ИНН ${inn} (${fullName})`);

    return {
      inn,
      creditHistoryMonths,
      activeLoansCount,
      closedLoansCount,
      totalActiveDebtByn,
      creditLimitUtilizationRatio,
      worstDelinquencyDaysEver,
      delinquenciesLast12Months,
      delinquencyHistory,
      hasActiveCollectionCase,
      requestedAt: new Date().toISOString(),
      raw: {
        source: 'MOCK_BKI',
        subject: fullName,
        note: 'Синтетический кредитный отчёт, сгенерирован детерминированно по ИНН для целей демонстрации скоринга.',
      },
    };
  }
}

function pickWorst(rand: () => number, buckets: number[]): number {
  return buckets[randomInt(rand, 0, buckets.length - 1)];
}
