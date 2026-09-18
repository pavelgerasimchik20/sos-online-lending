import { Injectable, Logger } from '@nestjs/common';
import { CreditRegistryPort, CreditRegistryReport } from '../interfaces/credit-registry.port';
import { createSeededRandom, randomInt } from '../../common/deterministic-random';

/**
 * Мок обращения в АИС КР Национального банка РБ. Возвращает
 * детерминированный (по ИНН) результат — суммарную долговую нагрузку
 * субъекта кредитной истории у всех заимодателей, зарегистрированных в
 * системе. Искусственная задержка имитирует сетевой вызов.
 *
 * Распределение намеренно смещено в сторону благоприятных значений
 * (большинство синтетических заявителей — с небольшой долговой нагрузкой),
 * чтобы демонстрационный скоринг чаще одобрял заявки, как и ожидается от
 * "среднего" клиента СОЗ, а не наказывал каждую вторую заявку случайно.
 */
@Injectable()
export class AisKrMockService implements CreditRegistryPort {
  private readonly logger = new Logger('АИС КР (мок)');

  async fetchDebtLoad(inn: string, fullName: string): Promise<CreditRegistryReport> {
    await new Promise((resolve) => setTimeout(resolve, 150));
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

    this.logger.log(`Запрос долговой нагрузки: ИНН ${inn} (${fullName}) -> ${activeLoansCount} активных обязательств`);

    return {
      inn,
      activeLoansCount,
      totalMonthlyObligationsByn,
      totalOutstandingDebtByn,
      requestedAt: new Date().toISOString(),
      raw: {
        source: 'MOCK_AIS_KR',
        subject: fullName,
        note: 'Синтетические данные, сгенерированы детерминированно по ИНН для целей демонстрации.',
      },
    };
  }
}
