import { Component, Input, computed, signal } from '@angular/core';

const OK_STATUSES = new Set([
  'VERIFIED',
  'ACTIVE',
  'PUBLISHED_FOR_FUNDING',
  'FUNDED',
  'PAID',
  'CONFIRMED',
  'CLOSED',
  'EARLY_REPAID',
  'APPROVED',
]);
const WARN_STATUSES = new Set([
  'PENDING',
  'SUBMITTED',
  'SCORED',
  'PARTIALLY_PAID',
  'SOFT_REMINDERS',
  'NOT_SUBMITTED',
]);
const DANGER_STATUSES = new Set([
  'REJECTED',
  'OVERDUE',
  'DEFAULT',
  'FAILED',
  'EXPIRED',
  'PRE_CLAIM',
  'LEGAL_ACTION',
  'CANCELLED',
  'REFUNDED',
  'BLOCKED',
]);

const LABELS: Record<string, string> = {
  NOT_SUBMITTED: 'Анкета не заполнена',
  NOT_STARTED: 'Не начата',
  PENDING: 'На проверке',
  VERIFIED: 'Подтверждено',
  REJECTED: 'Отклонено',
  DRAFT: 'Черновик',
  SUBMITTED: 'Отправлена',
  SCORED: 'Оценена',
  PUBLISHED_FOR_FUNDING: 'Сбор средств',
  FUNDED: 'Профинансирована',
  EXPIRED: 'Истёк срок',
  CANCELLED: 'Отменена',
  ACTIVE: 'Активен',
  OVERDUE: 'Просрочка',
  DEFAULT: 'Дефолт',
  CLOSED: 'Закрыт',
  EARLY_REPAID: 'Погашен досрочно',
  PARTIALLY_PAID: 'Частично оплачен',
  PAID: 'Оплачен',
  CONFIRMED: 'Подтверждён',
  FAILED: 'Ошибка',
  REFUNDED: 'Возвращено',
  SOFT_REMINDERS: 'Напоминания',
  PRE_CLAIM: 'Досудебная претензия',
  LEGAL_ACTION: 'Передано на взыскание',
  NONE: '—',
  BLOCKED: 'Заблокирован',
  APPROVED: 'Одобрено',
  APPROVED_WITH_CONDITIONS: 'Одобрено на других условиях',
};

@Component({
  selector: 'soz-status-badge',
  standalone: true,
  template: `<span class="soz-status" [class]="'soz-status--' + kind()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  private readonly statusSignal = signal<string>('');

  @Input({ required: true })
  set status(value: string) {
    this.statusSignal.set(value);
  }

  readonly label = computed(() => LABELS[this.statusSignal()] ?? this.statusSignal());

  readonly kind = computed<'ok' | 'warn' | 'danger' | 'muted'>(() => {
    const s = this.statusSignal();
    if (OK_STATUSES.has(s)) return 'ok';
    if (WARN_STATUSES.has(s)) return 'warn';
    if (DANGER_STATUSES.has(s)) return 'danger';
    return 'muted';
  });
}
