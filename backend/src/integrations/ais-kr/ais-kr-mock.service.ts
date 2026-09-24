import { Injectable, Logger } from '@nestjs/common';
import {
  CreditRegistryDelinquency,
  CreditRegistryPort,
  CreditRegistryReport,
} from '../interfaces/credit-registry.port';
import { createSeededRandom, randomInt } from '../../common/deterministic-random';

/**
 * Мок обращения в АИС КР Национального банка РБ. Возвращает
 * детерминированный (по ИНН) "кредитный отчёт" — долговую нагрузку у всех
 * зарегистрированных заимодателей и кредитную историю (просрочки,
 * утилизация лимитов, действующие дела о взыскании) субъекта. Искусственная
 * задержка имитирует сетевой вызов.
 *
 * Распределение намеренно смещено в сторону благоприятных значений
 * (большинство синтетических заявителей — с небольшой долговой нагрузкой и
 * благополучной историей), чтобы демонстрационный скоринг чаще одобрял
 * заявки, как и ожидается от "среднего" клиента СОЗ, а не наказывал каждую
 * вторую заявку случайно.
 */
@Injectable()
export class AisKrMockService implements CreditRegistryPort {
  private readonly logger = new Logger('АИС КР (мок)');

  async fetchDebtLoad(inn: string, fullName: string): Promise<CreditRegistryReport> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const rand = createSeededRandom(`aiskr:${inn}`);

    // rand() * rand() смещает распределение к нулю — большинство заявителей
    // без действующих займов или с одним небольшим.
    const activeLoansCount = Math.floor(3 * rand() * rand());
    let totalMonthlyObligationsByn = 0;
    let totalOutstandingDebtByn = 0;
    for (let i = 0; i < activeLoansCount; i++) {
      const monthly = randomInt(rand, 30, 250);
      totalMonthlyObligationsByn += monthly;
      totalOutstandingDebtByn += monthly * randomInt(rand, 2, 12);
    }

    const creditHistoryMonths = randomInt(rand, 6, 96);
    const closedLoansCount = randomInt(rand, 0, 6);

    // Просрочки — редкое событие: ~70% чистая история, тяжёлые просрочки — редкость.
    const delinquencyBuckets = [0, 0, 0, 0, 0, 0, 0, 5, 15, 30, 60, 90];
    const worstDelinquencyDaysEver = pickWorst(rand, delinquencyBuckets);
    const delinquenciesLast12Months = worstDelinquencyDaysEver > 0 ? randomInt(rand, 1, 2) : 0;

    const delinquencyHistory: CreditRegistryDelinquency[] = [];
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

    this.logger.log(
      `Запрос кредитного отчёта: ИНН ${inn} (${fullName}) -> ${activeLoansCount} активных обязательств`,
    );

    return {
      inn,
      activeLoansCount,
      totalMonthlyObligationsByn,
      totalOutstandingDebtByn,
      creditHistoryMonths,
      closedLoansCount,
      creditLimitUtilizationRatio,
      worstDelinquencyDaysEver,
      delinquenciesLast12Months,
      delinquencyHistory,
      hasActiveCollectionCase,
      requestedAt: new Date().toISOString(),
      raw: {
        source: 'MOCK_AIS_KR',
        subject: fullName,
        note: 'Синтетические данные, сгенерированы детерминированно по ИНН для целей демонстрации.',
      },
    };
  }
}

function pickWorst(rand: () => number, buckets: number[]): number {
  return buckets[randomInt(rand, 0, buckets.length - 1)];
}
