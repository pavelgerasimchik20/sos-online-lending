import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { ProfilesService } from '../profiles/profiles.service';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { WalletService } from '../wallet/wallet.service';
import { LoansService } from '../loans/loans.service';
import { PaymentsService } from '../payments/payments.service';
import { LoanApplicationStatus, MsiStatus, UserRole } from '../../common/enums';
import { LoanApplication } from '../loan-applications/loan-application.entity';
import { round2 } from '../../common/loan-math';

/**
 * Демо-учётные записи и пароль публикуются в README — это не секрет, а часть
 * демонстрационного стенда, разворачиваемого из чистого клона репозитория.
 */
export const DEMO_PASSWORD = 'Demo12345';
export const DEMO_LENDER_PHONE = '+375295780627';

interface BorrowerSeed {
  index: number;
  phone: string;
  lastName: string;
  firstName: string;
  patronymic?: string;
  requestedAmountByn: number;
  requestedTermMonths: number;
  purpose: string;
}

const BORROWERS: BorrowerSeed[] = [
  {
    index: 1,
    phone: '+375291110001',
    lastName: 'Сидоров',
    firstName: 'Алексей',
    patronymic: 'Иванович',
    requestedAmountByn: 1000,
    requestedTermMonths: 6,
    purpose: 'Ремонт квартиры',
  },
  {
    index: 2,
    phone: '+375291110002',
    lastName: 'Ковалёва',
    firstName: 'Ольга',
    patronymic: 'Викторовна',
    requestedAmountByn: 1000,
    requestedTermMonths: 6,
    purpose: 'Покупка техники',
  },
  {
    index: 3,
    phone: '+375291110003',
    lastName: 'Маркова',
    firstName: 'Елена',
    patronymic: 'Петровна',
    requestedAmountByn: 600,
    requestedTermMonths: 4,
    purpose: 'Покупка бытовой техники',
  },
  {
    index: 4,
    phone: '+375291110004',
    lastName: 'Волков',
    firstName: 'Артём',
    patronymic: 'Дмитриевич',
    requestedAmountByn: 2000,
    requestedTermMonths: 9,
    purpose: 'Оплата обучения',
  },
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
    private readonly usersService: UsersService,
    private readonly profilesService: ProfilesService,
    private readonly loanApplicationsService: LoanApplicationsService,
    private readonly marketplaceService: MarketplaceService,
    private readonly walletService: WalletService,
    private readonly loansService: LoansService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existingLender = await this.usersService.findByPhone(DEMO_LENDER_PHONE);
    if (existingLender) {
      return;
    }

    this.logger.log('Пустая база — засеваю демонстрационные данные (маркетплейс + инвестор со сделкой)...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const lender = await this.usersService.createUser(DEMO_LENDER_PHONE, passwordHash, [UserRole.LENDER]);
    await this.verifyLenderProfile(lender.id);
    await this.walletService.topUp(lender.id, 6000);

    const applications: LoanApplication[] = [];
    for (const seed of BORROWERS) {
      const application = await this.createBorrowerWithPublishedApplication(seed, passwordHash);
      if (application) {
        applications.push(application);
      } else {
        this.logger.warn(`Не удалось подобрать проходные демо-данные для заёмщика #${seed.index} (${seed.lastName})`);
      }
    }

    const [toFund, ...restPublished] = applications;
    if (toFund) {
      await this.fundAndSimulateRepayment(lender.id, toFund);
    }

    this.logger.log(
      `Демо-данные готовы: инвестор ${DEMO_LENDER_PHONE} / ${DEMO_PASSWORD}; в маркетплейсе ${restPublished.length} заявок; профинансировано и оплачен первый взнос: ${toFund ? 1 : 0}.`,
    );
  }

  private async verifyLenderProfile(userId: string): Promise<void> {
    const seed = 900;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await this.profilesService.submit(userId, {
        lastName: 'Гераскевич',
        firstName: 'Павел',
        patronymic: 'Викторович',
        birthDate: '1988-03-20',
        passportSeries: 'MP',
        passportNumber: buildPassportNumber(seed, attempt),
        passportIssuedBy: 'Мингорисполком',
        passportIssuedDate: '2013-04-15',
        inn: buildInn(seed, attempt),
        registrationAddress: 'г. Минск, ул. Примерная, д. 1, кв. 1',
        declaredMonthlyIncomeByn: 3200,
        employer: 'ООО «Демо Инвест»',
      });
      const afterMsi = await this.profilesService.verifyMsi(userId);
      if (afterMsi.msiStatus === MsiStatus.VERIFIED) {
        return;
      }
    }
    this.logger.warn('Не удалось пройти демо-идентификацию МСИ для инвестора после 40 попыток');
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
        passportNumber: buildPassportNumber(seed.index, attempt),
        passportIssuedBy: 'Мингорисполком',
        passportIssuedDate: '2017-08-01',
        inn: buildInn(seed.index, attempt),
        registrationAddress: 'г. Минск, ул. Примерная, д. 1, кв. 1',
        declaredMonthlyIncomeByn: 1600,
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

  private async fundAndSimulateRepayment(lenderId: string, application: LoanApplication): Promise<void> {
    const remaining = round2(Number(application.approvedAmountByn) - Number(application.fundedAmountByn ?? 0));
    await this.marketplaceService.commit(lenderId, application.id, remaining);

    const funded = await this.loanApplicationsService.findByIdOrThrow(application.id);
    if (!funded.loanId) {
      return;
    }

    const schedule = await this.loansService.listSchedule(funded.loanId);
    const firstInstallment = schedule[0];
    if (!firstInstallment) {
      return;
    }

    const payment = await this.paymentsService.initiate(
      funded.borrowerId,
      funded.loanId,
      Number(firstInstallment.totalDueByn),
    );
    await this.paymentsService.confirm(funded.borrowerId, payment.id);
  }
}
