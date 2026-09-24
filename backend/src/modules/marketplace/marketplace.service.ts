import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LenderCommitment } from './lender-commitment.entity';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletTransactionType } from '../wallet/wallet-transaction.entity';
import { DisbursementService } from '../disbursement/disbursement.service';
import { ProfilesService } from '../profiles/profiles.service';
import { LoansService } from '../loans/loans.service';
import { AuthService } from '../auth/auth.service';
import { CommitmentStatus, LoanApplicationStatus, LoanStatus, OtpPurpose, SmsTemplate } from '../../common/enums';
import { buildAnnuitySchedule, round2 } from '../../common/loan-math';
import { maskFullName } from '../../common/name-mask';
import { SMS_GATEWAY_PORT, SmsGatewayPort } from '../../integrations/interfaces/sms-gateway.port';
import { UsersService } from '../users/users.service';
import { LoanApplication } from '../loan-applications/loan-application.entity';
import { Loan } from '../loans/loan.entity';

export interface MarketplaceListing {
  applicationId: string;
  grade?: string;
  purpose: string;
  requestedAmountByn: number;
  approvedAmountByn?: number;
  approvedTermMonths?: number;
  annualRatePercent?: number;
  fundedAmountByn: number;
  remainingAmountByn: number;
  fundingDeadline?: Date;
  publishedAt?: Date;
  borrowerMaskedName?: string;
  borrowerStats?: { dealsCount: number; paidOnTimeCount: number; defaultedCount: number };
}

export interface ActiveDeal {
  loanId: string;
  status: LoanStatus;
  principalByn: number;
  annualRatePercent: number;
  termMonths: number;
  issuedAt: Date;
  borrowerMaskedName?: string;
  investorMaskedName?: string;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(LenderCommitment)
    private readonly repo: Repository<LenderCommitment>,
    private readonly applicationsService: LoanApplicationsService,
    private readonly walletService: WalletService,
    private readonly disbursementService: DisbursementService,
    private readonly profilesService: ProfilesService,
    private readonly loansService: LoansService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    @Inject(SMS_GATEWAY_PORT) private readonly smsGateway: SmsGatewayPort,
  ) {}

  async listOpenListings(): Promise<MarketplaceListing[]> {
    const applications = await this.applicationsService.listPublished();
    const now = new Date();
    const active = applications.filter((a) => !a.fundingDeadline || a.fundingDeadline > now);
    return Promise.all(active.map((application) => this.toListing(application)));
  }

  private async toListing(application: LoanApplication): Promise<MarketplaceListing> {
    const approved = Number(application.approvedAmountByn ?? 0);
    const funded = Number(application.fundedAmountByn ?? 0);
    const [borrowerProfile, borrowerStats] = await Promise.all([
      this.profilesService.findByUserId(application.borrowerId),
      this.loansService.getBorrowerStats(application.borrowerId),
    ]);
    return {
      applicationId: application.id,
      grade: application.grade,
      purpose: application.purpose,
      requestedAmountByn: Number(application.requestedAmountByn),
      approvedAmountByn: application.approvedAmountByn,
      approvedTermMonths: application.approvedTermMonths,
      annualRatePercent: application.annualRatePercent,
      fundedAmountByn: funded,
      remainingAmountByn: round2(approved - funded),
      fundingDeadline: application.fundingDeadline,
      publishedAt: application.publishedAt,
      borrowerMaskedName: borrowerProfile
        ? maskFullName(borrowerProfile.lastName, borrowerProfile.firstName, borrowerProfile.patronymic)
        : undefined,
      borrowerStats: {
        dealsCount: borrowerStats.dealsCount,
        paidOnTimeCount: borrowerStats.paidOnTimeCount,
        defaultedCount: borrowerStats.defaultedCount,
      },
    };
  }

  /**
   * Инвестор предлагает профинансировать заявку целиком и подписывает
   * предложение мок-ОТП на свой номер. Деньги на этом шаге НЕ списываются —
   * заявка переходит в статус "ожидает подтверждения заёмщика", и только
   * когда заёмщик тоже подпишет (см. {@link confirmFunding}), кошелёк
   * инвестора действительно дебетуется и заём выдаётся.
   */
  async propose(lenderId: string, applicationId: string, amountByn: number, otpCode: string): Promise<LenderCommitment> {
    await this.profilesService.requireFullyVerified(lenderId);

    const application = await this.applicationsService.findByIdOrThrow(applicationId);
    if (application.status !== LoanApplicationStatus.PUBLISHED_FOR_FUNDING) {
      throw new BadRequestException('Заявка недоступна для финансирования');
    }
    if (application.fundingDeadline && application.fundingDeadline < new Date()) {
      throw new BadRequestException('Срок сбора средств по заявке истёк');
    }
    if (application.borrowerId === lenderId) {
      throw new BadRequestException('Нельзя финансировать собственную заявку');
    }

    const approved = Number(application.approvedAmountByn ?? 0);

    // Заём финансируется строго одним инвестором целиком (не пулом из нескольких
    // инвесторов): заявка — от одного заёмщика и для одного инвестора.
    if (Math.abs(amountByn - approved) > 0.01) {
      throw new BadRequestException(`Заявку можно профинансировать только полностью, одним инвестором. Требуемая сумма: ${approved} BYN`);
    }

    const lender = await this.usersService.findByIdOrThrow(lenderId);
    if (!lender.phone) {
      throw new BadRequestException('Подпись договора доступна только пользователям с подтверждённым телефоном');
    }
    await this.authService.verifyOtp(lender.phone, OtpPurpose.CONTRACT_SIGNATURE, otpCode);

    let commitment = this.repo.create({
      applicationId,
      lenderId,
      amountByn,
      status: CommitmentStatus.PENDING_BORROWER_CONFIRMATION,
      lenderSignedAt: new Date(),
    });
    commitment = await this.repo.save(commitment);

    application.status = LoanApplicationStatus.AWAITING_BORROWER_CONFIRMATION;
    application.fundedAmountByn = amountByn;
    await this.applicationsService.save(application);

    const borrower = await this.usersService.findByIdOrThrow(application.borrowerId);
    await this.smsGateway.send(
      borrower.phone,
      SmsTemplate.APPLICATION_APPROVED,
      `SOS: Инвестор подписал предложение по вашей заявке №${application.id.slice(0, 8)} на ${amountByn} BYN. Подтвердите в личном кабинете, чтобы получить деньги.`,
      { applicationId: application.id, commitmentId: commitment.id },
    );

    return commitment;
  }

  /**
   * Заёмщик подтверждает получение денег и подписывает договор мок-ОТП на
   * свой номер. Только теперь кошелёк инвестора дебетуется, заём выдаётся,
   * сделка становится активной и попадает в публичный список активных сделок.
   */
  async confirmFunding(borrowerId: string, applicationId: string, otpCode: string): Promise<Loan> {
    const application = await this.applicationsService.findByIdOrThrow(applicationId);
    if (application.borrowerId !== borrowerId) {
      throw new ForbiddenException('Заявка принадлежит другому пользователю');
    }
    if (application.status !== LoanApplicationStatus.AWAITING_BORROWER_CONFIRMATION) {
      throw new BadRequestException('По заявке нет предложения, ожидающего подтверждения');
    }

    const commitment = await this.repo.findOne({
      where: { applicationId, status: CommitmentStatus.PENDING_BORROWER_CONFIRMATION },
    });
    if (!commitment) {
      throw new NotFoundException('Предложение по заявке не найдено');
    }

    const borrower = await this.usersService.findByIdOrThrow(borrowerId);
    if (!borrower.phone) {
      throw new BadRequestException('Подпись договора доступна только пользователям с подтверждённым телефоном');
    }
    await this.authService.verifyOtp(borrower.phone, OtpPurpose.CONTRACT_SIGNATURE, otpCode);

    // Деньги списываются с инвестора только сейчас — заёмщик подписал и забирает их.
    await this.walletService.debit(
      commitment.lenderId,
      Number(commitment.amountByn),
      WalletTransactionType.COMMITMENT_HOLD,
      applicationId,
      'Финансирование займа по подтверждённой сделке',
    );

    commitment.status = CommitmentStatus.ACTIVE;
    commitment.borrowerSignedAt = new Date();
    await this.repo.save(commitment);

    const { loan } = await this.disbursementService.issueAndDisburse(application, [
      { lenderId: commitment.lenderId, amountByn: Number(commitment.amountByn) },
    ]);

    application.status = LoanApplicationStatus.FUNDED;
    application.fundedAt = new Date();
    application.loanId = loan.id;
    await this.applicationsService.save(application);

    const lender = await this.usersService.findByIdOrThrow(commitment.lenderId);
    await this.smsGateway.send(
      lender.phone,
      SmsTemplate.LOAN_ISSUED,
      `SOS: Заёмщик подписал договор по заявке №${application.id.slice(0, 8)}. Заём на ${commitment.amountByn} BYN выдан, сделка активна.`,
      { applicationId: application.id, loanId: loan.id },
    );

    return loan;
  }

  /** Заёмщик отклоняет предложение — средства не резервировались, поэтому просто закрываем предложение, заявка снова открыта. */
  async declineFunding(borrowerId: string, applicationId: string): Promise<LoanApplication> {
    const application = await this.applicationsService.findByIdOrThrow(applicationId);
    if (application.borrowerId !== borrowerId) {
      throw new ForbiddenException('Заявка принадлежит другому пользователю');
    }
    if (application.status !== LoanApplicationStatus.AWAITING_BORROWER_CONFIRMATION) {
      throw new BadRequestException('По заявке нет предложения, ожидающего подтверждения');
    }

    const commitment = await this.repo.findOne({
      where: { applicationId, status: CommitmentStatus.PENDING_BORROWER_CONFIRMATION },
    });
    if (commitment) {
      commitment.status = CommitmentStatus.DECLINED_BY_BORROWER;
      await this.repo.save(commitment);
      const lender = await this.usersService.findByIdOrThrow(commitment.lenderId);
      await this.smsGateway.send(
        lender.phone,
        SmsTemplate.APPLICATION_REJECTED,
        `SOS: Заёмщик отклонил ваше предложение по заявке №${application.id.slice(0, 8)}.`,
        { applicationId: application.id },
      );
    }

    application.status = LoanApplicationStatus.PUBLISHED_FOR_FUNDING;
    application.fundedAmountByn = 0;
    return this.applicationsService.save(application);
  }

  /** Инвестор сам отзывает предложение, пока заёмщик не ответил (деньги ещё не резервировались). */
  async cancelCommitment(lenderId: string, commitmentId: string): Promise<LenderCommitment> {
    const commitment = await this.repo.findOne({ where: { id: commitmentId } });
    if (!commitment) {
      throw new NotFoundException('Обязательство не найдено');
    }
    if (commitment.lenderId !== lenderId) {
      throw new BadRequestException('Обязательство принадлежит другому пользователю');
    }
    if (commitment.status !== CommitmentStatus.PENDING_BORROWER_CONFIRMATION) {
      throw new BadRequestException('Отменить можно только предложение, ожидающее ответа заёмщика');
    }

    commitment.status = CommitmentStatus.CANCELLED;
    await this.repo.save(commitment);

    const application = await this.applicationsService.findByIdOrThrow(commitment.applicationId);
    application.status = LoanApplicationStatus.PUBLISHED_FOR_FUNDING;
    application.fundedAmountByn = 0;
    await this.applicationsService.save(application);

    return commitment;
  }

  /** Автоистечение заявок, по которым заёмщик не ответил на предложение в срок (вызывается из cron). Деньги не резервировались — просто закрываем. */
  async expireStaleApplications(): Promise<number> {
    const applications = await this.applicationsService.listStaleFundingCandidates();
    const now = new Date();
    let expiredCount = 0;

    for (const application of applications) {
      if (!application.fundingDeadline || application.fundingDeadline >= now) {
        continue;
      }
      const pending = await this.repo.find({
        where: { applicationId: application.id, status: CommitmentStatus.PENDING_BORROWER_CONFIRMATION },
      });
      for (const commitment of pending) {
        commitment.status = CommitmentStatus.CANCELLED;
        await this.repo.save(commitment);
      }
      application.status = LoanApplicationStatus.EXPIRED;
      await this.applicationsService.save(application);
      expiredCount += 1;
    }
    return expiredCount;
  }

  listMyCommitments(lenderId: string): Promise<LenderCommitment[]> {
    return this.repo.find({ where: { lenderId }, order: { createdAt: 'DESC' } });
  }

  listForApplication(applicationId: string): Promise<LenderCommitment[]> {
    return this.repo.find({ where: { applicationId } });
  }

  /** Заёмщик получает свой текущий (ожидающий или активный) commitment по заявке — нужен, чтобы открыть договор. */
  async getCurrentCommitmentForBorrower(borrowerId: string, applicationId: string): Promise<LenderCommitment> {
    const application = await this.applicationsService.findByIdOrThrow(applicationId);
    if (application.borrowerId !== borrowerId) {
      throw new ForbiddenException('Заявка принадлежит другому пользователю');
    }
    const commitment = await this.repo.findOne({
      where: [
        { applicationId, status: CommitmentStatus.PENDING_BORROWER_CONFIRMATION },
        { applicationId, status: CommitmentStatus.ACTIVE },
      ],
      order: { createdAt: 'DESC' },
    });
    if (!commitment) {
      throw new NotFoundException('По заявке нет действующего предложения');
    }
    return commitment;
  }

  /** Публичный (обезличенный) список активных сделок — для вкладки "Активные сделки" в маркетплейсе. */
  async listActiveDeals(): Promise<ActiveDeal[]> {
    const [loans, commitments] = await Promise.all([this.loansService.listAll(), this.repo.find({ where: { status: CommitmentStatus.ACTIVE } })]);
    const commitmentByApplicationId = new Map(commitments.map((c) => [c.applicationId, c]));

    const deals: ActiveDeal[] = [];
    for (const loan of loans) {
      const commitment = commitmentByApplicationId.get(loan.applicationId);
      const [borrowerProfile, lenderProfile] = await Promise.all([
        this.profilesService.findByUserId(loan.borrowerId),
        commitment ? this.profilesService.findByUserId(commitment.lenderId) : Promise.resolve(null),
      ]);
      deals.push({
        loanId: loan.id,
        status: loan.status,
        principalByn: Number(loan.principalByn),
        annualRatePercent: Number(loan.annualRatePercent),
        termMonths: loan.termMonths,
        issuedAt: loan.issuedAt,
        borrowerMaskedName: borrowerProfile
          ? maskFullName(borrowerProfile.lastName, borrowerProfile.firstName, borrowerProfile.patronymic)
          : undefined,
        investorMaskedName: lenderProfile
          ? maskFullName(lenderProfile.lastName, lenderProfile.firstName, lenderProfile.patronymic)
          : undefined,
      });
    }
    return deals.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  /**
   * Данные для договора займа: полные (немаскированные) персональные данные
   * обеих сторон + условия. Доступно только заёмщику и инвестору этого
   * конкретного предложения (или админу).
   */
  async getContractData(commitmentId: string, requesterId: string, isAdmin: boolean) {
    const commitment = await this.repo.findOne({ where: { id: commitmentId } });
    if (!commitment) {
      throw new NotFoundException('Предложение не найдено');
    }
    const application = await this.applicationsService.findByIdOrThrow(commitment.applicationId);
    if (!isAdmin && requesterId !== commitment.lenderId && requesterId !== application.borrowerId) {
      throw new ForbiddenException('Договор доступен только сторонам сделки');
    }

    const [borrowerProfile, lenderProfile] = await Promise.all([
      this.profilesService.findByUserId(application.borrowerId),
      this.profilesService.findByUserId(commitment.lenderId),
    ]);

    const amountByn = Number(commitment.amountByn);
    const termMonths = application.approvedTermMonths ?? 0;
    const annualRatePercent = Number(application.annualRatePercent ?? 0);
    const schedule =
      termMonths > 0
        ? buildAnnuitySchedule(amountByn, annualRatePercent, termMonths, commitment.createdAt).map((row) => ({
            ...row,
            dueDate: row.dueDate.toISOString().slice(0, 10),
          }))
        : [];

    return {
      commitmentId: commitment.id,
      commitmentStatus: commitment.status,
      applicationId: application.id,
      loanId: application.loanId,
      amountByn,
      termMonths: application.approvedTermMonths,
      annualRatePercent: application.annualRatePercent,
      purpose: application.purpose,
      createdAt: commitment.createdAt,
      lenderSignedAt: commitment.lenderSignedAt,
      borrowerSignedAt: commitment.borrowerSignedAt,
      borrower: borrowerProfile,
      lender: lenderProfile,
      schedule,
    };
  }
}
