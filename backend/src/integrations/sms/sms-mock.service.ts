import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsGatewayPort } from '../interfaces/sms-gateway.port';
import { SmsMessage } from './sms-message.entity';
import { SmsTemplate } from '../../common/enums';

/**
 * Мок SMS-шлюза. Реальная отправка не выполняется — сообщение
 * сохраняется в БД и пишется в лог, чтобы процесс напоминаний можно было
 * продемонстрировать и проверить через админ-кабинет / API без реального
 * SMS-провайдера.
 */
@Injectable()
export class SmsMockService implements SmsGatewayPort {
  private readonly logger = new Logger('SMS');

  constructor(
    @InjectRepository(SmsMessage)
    private readonly repo: Repository<SmsMessage>,
  ) {}

  async send(
    phone: string | null,
    template: SmsTemplate,
    text: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!phone) {
      this.logger.warn(`Пропущена отправка SMS [${template}] — у получателя не указан телефон`);
      return;
    }
    this.logger.log(`-> ${phone} [${template}]: ${text}`);
    const message = this.repo.create({ phone, template, body: text, meta, status: 'SENT' });
    await this.repo.save(message);
  }

  listForPhone(phone: string): Promise<SmsMessage[]> {
    return this.repo.find({ where: { phone }, order: { createdAt: 'DESC' } });
  }

  listAll(limit = 200): Promise<SmsMessage[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
