/**
 * ⚠️ ЮРИДИЧЕСКИЙ ДИСКЛЕЙМЕР
 * ------------------------------------------------------------------
 * Значения ниже — иллюстративные, настраиваемые константы, приближённые
 * к общей логике регулирования микрозаймов и деятельности СОЗ в РБ
 * (Указ Президента №325 "О привлечении и предоставлении займов,
 * деятельности ломбардов", нормативные акты Национального банка РБ).
 * Это НЕ юридически выверенные значения. Перед реальным запуском СОЗ
 * необходима проверка действующих НПА и юридическое заключение, а также
 * регистрация оператора платформы в реестре Национального банка РБ.
 *
 * Все константы вынесены в один файл и продублированы записью в таблицу
 * `platform_settings`, чтобы администратор мог менять их через админ-кабинет
 * без деплоя (см. AdminModule / SettingsService).
 */
export const LEGAL_RULES = {
  LOAN: {
    MIN_AMOUNT_BYN: 100,
    MAX_AMOUNT_BYN: 7500,
    MIN_TERM_MONTHS: 1,
    MAX_TERM_MONTHS: 12,
  },
  RATES: {
    // Потолок номинальной годовой ставки, применяемой скорингом.
    MAX_ANNUAL_RATE_PERCENT: 84,
    // Ставки по грейдам A..E (номинал, % годовых) — в пределах потолка.
    GRADE_ANNUAL_RATE_PERCENT: {
      A: 18,
      B: 30,
      C: 45,
      D: 60,
      E: 84,
    } as Record<'A' | 'B' | 'C' | 'D' | 'E', number>,
  },
  PENALTY: {
    DEFAULT_DAILY_PERCENT: 0.1,
    MAX_DAILY_PERCENT: 0.15,
    // Суммарно проценты + пеня не должны превышать этот множитель от суммы
    // основного долга (защита заёмщика от неограниченного роста долга).
    MAX_TOTAL_OVERPAYMENT_MULTIPLIER: 2,
  },
  UNDERWRITING: {
    // Предельная долговая нагрузка (сумма ежемесячных обязательств,
    // включая новый платёж, к заявленному доходу).
    MAX_DEBT_TO_INCOME_RATIO: 0.5,
    MIN_SCORE_TO_APPROVE: 480,
    MIN_SCORE_FULL_APPROVAL: 650,
  },
  FUNDING: {
    WINDOW_DAYS: 3,
  },
  COLLECTIONS: {
    SOFT_REMINDER_DAYS_AFTER_DUE: [1, 3, 7],
    PRE_CLAIM_DAY_AFTER_DUE: 30,
    LEGAL_ACTION_DAY_AFTER_DUE: 90,
  },
  NOTIFICATIONS: {
    REMIND_BEFORE_DUE_DAYS: 3,
  },
  PAYMENT_ALLOCATION_ORDER: ['INTEREST', 'PRINCIPAL', 'PENALTY'] as const,
};

export type LegalRules = typeof LEGAL_RULES;
