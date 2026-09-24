import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanApplication } from './loan-application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CalculatePreviewDto } from './dto/calculate-preview.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { ScoringService } from '../scoring/scoring.service';
import { LoanApplicationStatus, ScoringDecision } from '../../common/enums';
import { LEGAL_RULES } from '../../config/legal-rules.config';
import {
  annuityPayment,
  buildAnnuitySchedule,
  fullCostOfCreditPercent,
  round2,
} from '../../common/loan-math';

@Injectable()
export class LoanApplicationsService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly repo: Repository<LoanApplication>,
    private readonly profilesService: ProfilesService,
    private readonly scoringService: ScoringService,
  ) {}

  /** Предварительный расчёт графика/ПСК до подачи заявки (по референсной ставке грейда C). */
  calculatePreview(dto: CalculatePreviewDto) {
    const referenceRate = LEGAL_RULES.RATES.GRADE_ANNUAL_RATE_PERCENT.C;
    const schedule = buildAnnuitySchedule(dto.amountByn, referenceRate, dto.termMonths, new Date());
    const monthlyPayment = round2(annuityPayment(dto.amountByn, referenceRate, dto.termMonths));
    const totalPayable = round2(schedule.reduce((sum, row) => sum + row.totalDue, 0));
    return {
      note: 'Предварительный расчёт по ориентировочной ставке. Итоговая ставка определяется по результатам скоринга.',
      referenceAnnualRatePercent: referenceRate,
      monthlyPayment,
      totalPayable,
      totalInterest: round2(totalPayable - dto.amountByn),
      fullCostOfCreditPercent: fullCostOfCreditPercent(dto.amountByn, totalPayable, dto.termMonths),
      schedule: schedule.map((row) => ({ ...row, dueDate: row.dueDate.toISOString().slice(0, 10) })),
    };
  }

  async create(borrowerId: string, dto: CreateApplicationDto): Promise<LoanApplication> {
    const profile = await this.profilesService.requireFullyVerified(borrowerId);

    const activeCount = await this.repo.count({
      where: [
        { borrowerId, status: LoanApplicationStatus.SUBMITTED },
        { borrowerId, status: LoanApplicationStatus.PUBLISHED_FOR_FUNDING },
      ],
    });
    if (activeCount > 0) {
      throw new BadRequestException('У вас уже есть активная заявка в обработке или на финансировании');
    }

    let application = this.repo.create({
      borrowerId,
      requestedAmountByn: dto.requestedAmountByn,
      requestedTermMonths: dto.requestedTermMonths,
      purpose: dto.purpose,
      status: LoanApplicationStatus.SUBMITTED,
    });
    application = await this.repo.save(application);

    const scoringResult = await this.scoringService.score({
      applicationId: application.id,
      profile,
      requestedAmountByn: dto.requestedAmountByn,
      requestedTermMonths: dto.requestedTermMonths,
    });

    application.scoringResultId = scoringResult.id;
    application.grade = scoringResult.grade;
    application.scoringReasons = scoringResult.reasons;

    if (scoringResult.decision === ScoringDecision.REJECTED) {
      application.status = LoanApplicationStatus.REJECTED;
    } else {
      application.status = LoanApplicationStatus.PUBLISHED_FOR_FUNDING;
      application.approvedAmountByn = scoringResult.approvedAmountByn;
      application.approvedTermMonths = scoringResult.approvedTermMonths;
      application.annualRatePercent = scoringResult.annualRatePercent;
      application.publishedAt = new Date();
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + LEGAL_RULES.FUNDING.WINDOW_DAYS);
      application.fundingDeadline = deadline;
    }

    return this.repo.save(application);
  }

  async findByIdOrThrow(id: string): Promise<LoanApplication> {
    const application = await this.repo.findOne({ where: { id } });
    if (!application) {
      throw new NotFoundException('Заявка не найдена');
    }
    return application;
  }

  async findMineOrThrow(id: string, borrowerId: string): Promise<LoanApplication> {
    const application = await this.findByIdOrThrow(id);
    if (application.borrowerId !== borrowerId) {
      throw new ForbiddenException('Заявка принадлежит другому пользователю');
    }
    return application;
  }

  listMine(borrowerId: string): Promise<LoanApplication[]> {
    return this.repo.find({ where: { borrowerId }, order: { createdAt: 'DESC' } });
  }

  listPublished(): Promise<LoanApplication[]> {
    return this.repo.find({
      where: { status: LoanApplicationStatus.PUBLISHED_FOR_FUNDING },
      order: { publishedAt: 'ASC' },
    });
  }

  /** Заявки, у которых мог истечь срок сбора: опубликованные и ожидающие подтверждения заёмщика (для cron-истечения). */
  listStaleFundingCandidates(): Promise<LoanApplication[]> {
    return this.repo.find({
      where: [
        { status: LoanApplicationStatus.PUBLISHED_FOR_FUNDING },
        { status: LoanApplicationStatus.AWAITING_BORROWER_CONFIRMATION },
      ],
      order: { publishedAt: 'ASC' },
    });
  }

  listAll(): Promise<LoanApplication[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  save(application: LoanApplication): Promise<LoanApplication> {
    return this.repo.save(application);
  }

  async cancelMine(id: string, borrowerId: string): Promise<LoanApplication> {
    const application = await this.findMineOrThrow(id, borrowerId);
    if (application.status !== LoanApplicationStatus.PUBLISHED_FOR_FUNDING) {
      throw new BadRequestException('Отменить можно только заявку, ожидающую финансирования');
    }
    if (Number(application.fundedAmountByn) > 0) {
      throw new BadRequestException(
        'Заявка уже частично профинансирована. Обратитесь в поддержку для отмены со сбором средств',
      );
    }
    application.status = LoanApplicationStatus.CANCELLED;
    return this.repo.save(application);
  }
}
