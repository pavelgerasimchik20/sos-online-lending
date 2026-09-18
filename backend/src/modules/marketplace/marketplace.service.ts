import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LenderCommitment } from './lender-commitment.entity';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletTransactionType } from '../wallet/wallet-transaction.entity';
import { DisbursementService } from '../disbursement/disbursement.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CommitmentStatus, LoanApplicationStatus, SmsTemplate } from '../../common/enums';
import { round2 } from '../../common/loan-math';
import { SMS_GATEWAY_PORT, SmsGatewayPort } from '../../integrations/interfaces/sms-gateway.port';
import { UsersService } from '../users/users.service';
import { LoanApplication } from '../loan-applications/loan-application.entity';

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
}

/** Маскирует фамилию для обезличенного листинга (Иванова → И.....а), имя и отчество оставляет как в примере ТЗ. */
function maskSurname(surname: string): string {
  const trimmed = surname.trim();
  if (trimmed.length <= 2) {
    return trimmed;
  }
  return `${trimmed[0]}${'.'.repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
}

function maskBorrowerName(lastName: string, firstName: string, patronymic?: string | null): string {
  const parts = [maskSurname(lastName), firstName.trim()];
  if (patronymic && patronymic.trim()) {
    parts.push(`${patronymic.trim()[0]}.`);
  }
  return parts.join(' ');
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
    private readonly usersService: UsersService,
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
    const borrowerProfile = await this.profilesService.findByUserId(application.borrowerId);
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
        ? maskBorrowerName(borrowerProfile.lastName, borrowerProfile.firstName, borrowerProfile.patronymic)
        : undefined,
    };
  }

  async commit(lenderId: string, applicationId: string, amountByn: number): Promise<LenderCommitment> {
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
    const remaining = round2(approved - Number(application.fundedAmountByn ?? 0));

    // Заём финансируется строго одним займодавцем целиком (не пулом из нескольких
    // инвесторов): заявка — от одного заёмщика и для одного займодавца.
    if (Math.abs(amountByn - remaining) > 0.01) {
      throw new BadRequestException(
        `Заявку можно профинансировать только полностью, одним займодавцем. Требуемая сумма: ${remaining} BYN`,
      );
    }

    await this.walletService.debit(
      lenderId,
      amountByn,
      WalletTransactionType.COMMITMENT_HOLD,
      applicationId,
      'Резервирование средств под финансирование заявки',
    );

    let commitment = this.repo.create({
      applicationId,
      lenderId,
      amountByn,
      status: CommitmentStatus.ACTIVE,
    });
    commitment = await this.repo.save(commitment);

    application.fundedAmountByn = round2(Number(application.fundedAmountByn ?? 0) + amountByn);
    await this.applicationsService.save(application);

    if (application.fundedAmountByn >= approved - 0.01) {
      await this.completeFunding(application);
    }

    return commitment;
  }

  private async completeFunding(application: LoanApplication): Promise<void> {
    const commitments = await this.repo.find({
      where: { applicationId: application.id, status: CommitmentStatus.ACTIVE },
    });
    const { loan } = await this.disbursementService.issueAndDisburse(
      application,
      commitments.map((c) => ({ lenderId: c.lenderId, amountByn: Number(c.amountByn) })),
    );

    application.status = LoanApplicationStatus.FUNDED;
    application.fundedAt = new Date();
    application.loanId = loan.id;
    await this.applicationsService.save(application);

    for (const commitment of commitments) {
      const lender = await this.usersService.findByIdOrThrow(commitment.lenderId);
      await this.smsGateway.send(
        lender.phone,
        SmsTemplate.LOAN_ISSUED,
        `SOS: Заявка №${application.id.slice(0, 8)} профинансирована вами целиком (${commitment.amountByn} BYN). Заём выдан заёмщику.`,
        { applicationId: application.id, loanId: loan.id },
      );
    }
  }

  async cancelCommitment(lenderId: string, commitmentId: string): Promise<LenderCommitment> {
    const commitment = await this.repo.findOne({ where: { id: commitmentId } });
    if (!commitment) {
      throw new NotFoundException('Обязательство не найдено');
    }
    if (commitment.lenderId !== lenderId) {
      throw new BadRequestException('Обязательство принадлежит другому пользователю');
    }
    if (commitment.status !== CommitmentStatus.ACTIVE) {
      throw new BadRequestException('Обязательство уже закрыто');
    }
    const application = await this.applicationsService.findByIdOrThrow(commitment.applicationId);
    if (application.status !== LoanApplicationStatus.PUBLISHED_FOR_FUNDING) {
      throw new BadRequestException('Заявка уже профинансирована — отменить участие нельзя');
    }

    commitment.status = CommitmentStatus.CANCELLED;
    await this.repo.save(commitment);

    application.fundedAmountByn = round2(Number(application.fundedAmountByn) - Number(commitment.amountByn));
    await this.applicationsService.save(application);

    await this.walletService.credit(
      lenderId,
      Number(commitment.amountByn),
      WalletTransactionType.COMMITMENT_REFUND,
      commitment.applicationId,
      'Возврат средств: отмена участия в финансировании',
    );

    return commitment;
  }

  /** Автоистечение заявок, не собравших полную сумму в срок (вызывается из cron). */
  async expireStaleApplications(): Promise<number> {
    const published = await this.applicationsService.listPublished();
    const now = new Date();
    let expiredCount = 0;

    for (const application of published) {
      if (!application.fundingDeadline || application.fundingDeadline >= now) {
        continue;
      }
      const commitments = await this.repo.find({
        where: { applicationId: application.id, status: CommitmentStatus.ACTIVE },
      });
      for (const commitment of commitments) {
        commitment.status = CommitmentStatus.REFUNDED;
        await this.repo.save(commitment);
        await this.walletService.credit(
          commitment.lenderId,
          Number(commitment.amountByn),
          WalletTransactionType.COMMITMENT_REFUND,
          commitment.applicationId,
          'Возврат средств: срок сбора по заявке истёк',
        );
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
}
