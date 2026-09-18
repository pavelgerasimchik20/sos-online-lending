import { SmsTemplate } from '../../common/enums';

export const SMS_GATEWAY_PORT = Symbol('SMS_GATEWAY_PORT');

export interface SmsGatewayPort {
  send(phone: string | null, template: SmsTemplate, text: string, meta?: Record<string, unknown>): Promise<void>;
}
