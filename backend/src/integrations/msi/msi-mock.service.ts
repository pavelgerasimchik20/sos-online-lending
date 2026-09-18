import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MsiPort, MsiVerificationResult } from '../interfaces/msi.port';
import { createSeededRandom } from '../../common/deterministic-random';

/**
 * Мок МСИ. Идентификация почти всегда проходит успешно (формальные данные
 * уже провалидированы на этапе KYC) — имитируем лишь сетевую задержку и
 * редкий синтетический отказ, чтобы показать обработку ошибки в интерфейсе.
 */
@Injectable()
export class MsiMockService implements MsiPort {
  private readonly logger = new Logger('МСИ (мок)');

  async verifyIdentity(input: {
    inn: string;
    passportSeries: string;
    passportNumber: string;
    fullName: string;
  }): Promise<MsiVerificationResult> {
    await new Promise((resolve) => setTimeout(resolve, 700));

    const rand = createSeededRandom(`msi:${input.inn}:${input.passportNumber}`);
    const verified = rand() > 0.03; // ~3% синтетических отказов для демонстрации

    this.logger.log(
      `Запрос идентификации МСИ: ${input.fullName}, ИНН ${input.inn} -> ${verified ? 'подтверждено' : 'отказ'}`,
    );

    return {
      verified,
      reference: `MSI-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      checkedAt: new Date().toISOString(),
      reason: verified
        ? undefined
        : 'Данные не удалось сверить с биометрическим профилем МСИ. Повторите попытку позже.',
    };
  }
}
