import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { ProfilesService } from '../profiles/profiles.service';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { LoanApplicationStatus, MsiStatus, UserRole } from '../../common/enums';
import { LoanApplication } from '../loan-applications/loan-application.entity';
import { annuityPayment } from '../../common/loan-math';
import { LEGAL_RULES } from '../../config/legal-rules.config';

/**
 * Демо-пароль публикуется в README — это не секрет, а часть демонстрационного
 * стенда, разворачиваемого из чистого клона репозитория.
 */
export const DEMO_PASSWORD = 'Demo12345';

interface BorrowerSeed {
  seed: number;
  phone: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  requestedAmountByn: number;
  requestedTermMonths: number;
  purpose: string;
}

interface InvestorSeed {
  seed: number;
  phone: string;
  lastName: string;
  firstName: string;
  patronymic: string;
}

const BORROWERS: BorrowerSeed[] = [
  { seed: 1, phone: '+375291200001', lastName: 'Сидоренко', firstName: 'Алексей', patronymic: 'Иванович', requestedAmountByn: 1500, requestedTermMonths: 6, purpose: 'Ремонт квартиры' },
  { seed: 2, phone: '+375291200002', lastName: 'Ковалёва', firstName: 'Ольга', patronymic: 'Викторовна', requestedAmountByn: 3000, requestedTermMonths: 9, purpose: 'Покупка техники' },
  { seed: 3, phone: '+375291200003', lastName: 'Маркова', firstName: 'Елена', patronymic: 'Петровна', requestedAmountByn: 800, requestedTermMonths: 4, purpose: 'Лечение' },
  { seed: 4, phone: '+375291200004', lastName: 'Волков', firstName: 'Артём', patronymic: 'Дмитриевич', requestedAmountByn: 5000, requestedTermMonths: 12, purpose: 'Оплата обучения' },
  { seed: 5, phone: '+375291200005', lastName: 'Прокопович', firstName: 'Дмитрий', patronymic: 'Сергеевич', requestedAmountByn: 2000, requestedTermMonths: 6, purpose: 'Покупка автомобиля' },
  { seed: 6, phone: '+375291200006', lastName: 'Новикова', firstName: 'Анастасия', patronymic: 'Андреевна', requestedAmountByn: 1200, requestedTermMonths: 3, purpose: 'Покупка мебели' },
  { seed: 7, phone: '+375291200007', lastName: 'Романюк', firstName: 'Игорь', patronymic: 'Олегович', requestedAmountByn: 7000, requestedTermMonths: 12, purpose: 'Ремонт квартиры' },
  { seed: 8, phone: '+375291200008', lastName: 'Бондаренко', firstName: 'Наталья', patronymic: 'Игоревна', requestedAmountByn: 600, requestedTermMonths: 2, purpose: 'Отпуск' },
  { seed: 9, phone: '+375291200009', lastName: 'Шевченко', firstName: 'Максим', patronymic: 'Владимирович', requestedAmountByn: 4000, requestedTermMonths: 10, purpose: 'Свадьба' },
  { seed: 10, phone: '+375291200010', lastName: 'Лукашевич', firstName: 'Виктория', patronymic: 'Сергеевна', requestedAmountByn: 9000, requestedTermMonths: 12, purpose: 'Пополнение оборотных средств' },
];

const INVESTORS: InvestorSeed[] = [
  { seed: 101, phone: '+375291300001', lastName: 'Гераскевич', firstName: 'Павел', patronymic: 'Викторович' },
  { seed: 102, phone: '+375291300002', lastName: 'Кузнецова', firstName: 'Марина', patronymic: 'Александровна' },
  { seed: 103, phone: '+375291300003', lastName: 'Морозов', firstName: 'Сергей', patronymic: 'Николаевич' },
  { seed: 104, phone: '+375291300004', lastName: 'Азарова', firstName: 'Екатерина', patronymic: 'Дмитриевна' },
  { seed: 105, phone: '+375291300005', lastName: 'Ткачук', firstName: 'Владимир', patronymic: 'Петрович' },
  { seed: 106, phone: '+375291300006', lastName: 'Соколова', firstName: 'Юлия', patronymic: 'Игоревна' },
  { seed: 107, phone: '+375291300007', lastName: 'Гринкевич', firstName: 'Андрей', patronymic: 'Олегович' },
  { seed: 108, phone: '+375291300008', lastName: 'Павлюченко', firstName: 'Ирина', patronymic: 'Сергеевна' },
  { seed: 109, phone: '+375291300009', lastName: 'Костюкевич', firstName: 'Роман', patronymic: 'Андреевич' },
  { seed: 110, phone: '+375291300010', lastName: 'Захарова', firstName: 'Виктория', patronymic: 'Павловна' },
];

/** Подбирает синтетический ИНН формата РБ (7 цифр + буква + 3 цифры + 2 буквы + цифра). */
function buildInn(seed: number, attempt: number): string {
  const digits7 = String(1_000_000 + seed * 1000 + attempt).padStart(7, '0').slice(-7);
  const letter1 = String.fromCharCode(65 + (seed % 26));
  const mid3 = String(100 + attempt).padStart(3, '0').slice(-3);
  const lastDigit = (seed + attempt) % 10;
  return `${digits7}${letter1}${mid3}PB${lastDigit}`;
}

function buildPassportNumber(seed: number, attempt: number): string {
  return String(2_000_000 + seed * 1000 + attempt).padStart(7, '0').slice(-7);
}

@Injectable()
export class DemoSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('DemoSeed');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly profilesService: ProfilesService,
    private readonly loanApplicationsService: LoanApplicationsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const sentinel = await this.usersService.findByPhone(INVESTORS[0].phone);
    if (sentinel) {
      return;
    }
    this.logger.log('Пустая база — засеваю демонстрационные данные (10 заёмщиков + 10 инвесторов)...');
    await this.seedAll();
  }

  /** Полная пересборка демо-данных: удаляет всех тестовых заёмщиков/инвесторов и создаёт новых (учётку admin не трогает). */
  async resetAndSeed(): Promise<{ borrowersCreated: number; investorsCreated: number; publishedApplications: number }> {
    this.logger.log('Полный сброс тестовых данных...');
    await this.wipeTestData();
    return this.seedAll();
  }

  private async wipeTestData(): Promise<void> {
    const tables = [
      'lender_payouts',
      'payments',
      'payment_schedule_items',
      'loan_lender_shares',
      'disbursements',
      'loans',
      'lender_commitments',
      'scoring_results',
      'loan_applications',
      'wallet_transactions',
      'lender_wallets',
      'default_cases',
      'sms_messages',
      'otp_codes',
      'profiles',
    ];
    for (const table of tables) {
      await this.dataSource.query(`DELETE FROM ${table}`);
    }
    await this.dataSource.query(`DELETE FROM users WHERE NOT ('ADMIN' = ANY(roles))`);
  }

  private async seedAll(): Promise<{ borrowersCreated: number; investorsCreated: number; publishedApplications: number }> {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    let investorsCreated = 0;
    for (const seed of INVESTORS) {
      const user = await this.usersService.createUser(seed.phone, passwordHash, [UserRole.LENDER]);
      const verified = await this.verifyProfile(user.id, seed.seed, seed);
      if (verified) investorsCreated += 1;
      // Кошелёк создаётся лениво при первом обращении (WalletService.getOrCreate) —
      // баланс/вложено/заработано остаются нулевыми, пока пользователь сам не пополнит.
    }

    let borrowersCreated = 0;
    let publishedApplications = 0;
    for (const seed of BORROWERS) {
      const application = await this.createBorrowerWithPublishedApplication(seed, passwordHash);
      borrowersCreated += 1;
      if (application) publishedApplications += 1;
      else this.logger.warn(`Не удалось подобрать проходные демо-данные для заёмщика #${seed.seed} (${seed.lastName})`);
    }

    this.logger.log(
      `Демо-данные готовы: ${investorsCreated}/${INVESTORS.length} инвесторов, ${borrowersCreated}/${BORROWERS.length} заёмщиков, ${publishedApplications} заявок опубликовано в маркетплейсе. Пароль для всех: ${DEMO_PASSWORD}.`,
    );
    return { borrowersCreated, investorsCreated, publishedApplications };
  }

  private async verifyProfile(
    userId: string,
    seed: number,
    name: { lastName: string; firstName: string; patronymic?: string },
  ): Promise<boolean> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await this.profilesService.submit(userId, {
        lastName: name.lastName,
        firstName: name.firstName,
        patronymic: name.patronymic,
        birthDate: '1988-03-20',
        passportSeries: 'MP',
        passportNumber: buildPassportNumber(seed, attempt),
        passportIssuedBy: 'Мингорисполком',
        passportIssuedDate: '2013-04-15',
        inn: buildInn(seed, attempt),
        registrationAddress: 'г. Минск, ул. Примерная, д. 1, кв. 1',
        declaredMonthlyIncomeByn: 2200,
        employer: 'ООО «Демо Компания»',
      });
      const afterMsi = await this.profilesService.verifyMsi(userId);
      if (afterMsi.msiStatus === MsiStatus.VERIFIED) {
        return true;
      }
    }
    return false;
  }

  private async createBorrowerWithPublishedApplication(
    seed: BorrowerSeed,
    passwordHash: string,
  ): Promise<LoanApplication | null> {
    const user = await this.usersService.createUser(seed.phone, passwordHash, [UserRole.BORROWER]);

    for (let attempt = 0; attempt < 40; attempt += 1) {
      await this.profilesService.submit(user.id, {
        lastName: seed.lastName,
        firstName: seed.firstName,
        patronymic: seed.patronymic,
        birthDate: '1992-07-15',
        passportSeries: 'MP',
        passportNumber: buildPassportNumber(seed.seed, attempt),
        passportIssuedBy: 'Мингорисполком',
        passportIssuedDate: '2017-08-01',
        inn: buildInn(seed.seed, attempt),
        registrationAddress: 'г. Минск, ул. Примерная, д. 1, кв. 1',
        // Доход подобран с запасом (по худшей ставке грейда E) относительно суммы/срока
        // займа, чтобы одобрение зависело от скоринга кредитной истории, а не упиралось в ПДН.
        declaredMonthlyIncomeByn: this.minSafeIncome(seed.requestedAmountByn, seed.requestedTermMonths),
        employer: 'ООО «Демо Компания»',
      });
      const afterMsi = await this.profilesService.verifyMsi(user.id);
      if (afterMsi.msiStatus !== MsiStatus.VERIFIED) {
        continue;
      }

      const application = await this.loanApplicationsService.create(user.id, {
        requestedAmountByn: seed.requestedAmountByn,
        requestedTermMonths: seed.requestedTermMonths,
        purpose: seed.purpose,
      });
      if (application.status === LoanApplicationStatus.PUBLISHED_FOR_FUNDING) {
        return application;
      }
    }
    return null;
  }

  /** Минимальный доход, при котором заявка не отклонится по ПДН даже при худшей ставке (грейд E), с запасом 15%. */
  private minSafeIncome(amountByn: number, termMonths: number): number {
    const worstCasePayment = annuityPayment(amountByn, LEGAL_RULES.RATES.GRADE_ANNUAL_RATE_PERCENT.E, termMonths);
    return Math.ceil((worstCasePayment / LEGAL_RULES.UNDERWRITING.MAX_DEBT_TO_INCOME_RATIO) * 1.15);
  }
}
