import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoringResult } from './scoring-result.entity';
import { CREDIT_BUREAU_PORT, CreditBureauPort } from '../../integrations/interfaces/credit-bureau.port';
import {
  CREDIT_REGISTRY_PORT,
  CreditRegistryPort,
} from '../../integrations/interfaces/credit-registry.port';
import { ScoringDecision, ScoringGrade } from '../../common/enums';
import { LEGAL_RULES } from '../../config/legal-rules.config';
import { annuityPayment, maxPrincipalForPayment, round2 } from '../../common/loan-math';
import { Profile } from '../profiles/profile.entity';

export interface ScoringInput {
  applicationId: string;
  profile: Profile;
  requestedAmountByn: number;
  requestedTermMonths: number;
}

@Injectable()
export class ScoringService {
  constructor(
    @InjectRepository(ScoringResult)
    private readonly repo: Repository<ScoringResult>,
    @Inject(CREDIT_BUREAU_PORT) private readonly bkiPort: CreditBureauPort,
    @Inject(CREDIT_REGISTRY_PORT) private readonly aisKrPort: CreditRegistryPort,
  ) {}

  async score(input: ScoringInput): Promise<ScoringResult> {
    const fullName = `${input.profile.lastName} ${input.profile.firstName} ${input.profile.patronymic ?? ''}`.trim();
    const [bki, aisKr] = await Promise.all([
      this.bkiPort.fetchReport(input.profile.inn, fullName),
      this.aisKrPort.fetchDebtLoad(input.profile.inn, fullName),
    ]);

    const reasons: string[] = [];

    // --- Базовый балл по кредитной истории (БКИ) ---
    let score = 500;

    const historyBonus = Math.min(bki.creditHistoryMonths, 60) * 1.5;
    score += historyBonus;
    reasons.push(`Кредитная история: ${bki.creditHistoryMonths} мес. (${historyBonus >= 0 ? '+' : ''}${round2(historyBonus)} б.)`);

    const delinquencyPenalty = delinquencyScorePenalty(bki.worstDelinquencyDaysEver);
    score += delinquencyPenalty;
    if (bki.worstDelinquencyDaysEver > 0) {
      reasons.push(
        `Максимальная просрочка в прошлом: ${bki.worstDelinquencyDaysEver} дн. (${delinquencyPenalty} б.)`,
      );
    } else {
      reasons.push('Просрочек в кредитной истории не выявлено (+0 б.)');
    }

    const recentDelinquencyPenalty = bki.delinquenciesLast12Months * -20;
    score += recentDelinquencyPenalty;
    if (bki.delinquenciesLast12Months > 0) {
      reasons.push(
        `Просрочки за последние 12 мес.: ${bki.delinquenciesLast12Months} (${recentDelinquencyPenalty} б.)`,
      );
    }

    let utilizationAdj = 10;
    if (bki.creditLimitUtilizationRatio > 0.7) {
      utilizationAdj = -40;
    } else if (bki.creditLimitUtilizationRatio > 0.4) {
      utilizationAdj = -15;
    }
    score += utilizationAdj;
    reasons.push(
      `Использование кредитных лимитов: ${Math.round(bki.creditLimitUtilizationRatio * 100)}% (${utilizationAdj >= 0 ? '+' : ''}${utilizationAdj} б.)`,
    );

    const activeLoansPenalty = Math.max(0, bki.activeLoansCount - 1) * -15;
    score += activeLoansPenalty;
    if (activeLoansPenalty < 0) {
      reasons.push(`Действующих займов у БКИ: ${bki.activeLoansCount} (${activeLoansPenalty} б.)`);
    }

    if (bki.hasActiveCollectionCase) {
      score -= 300;
      reasons.push('Есть активное дело о взыскании по данным БКИ (-300 б.)');
    }

    // --- Долговая нагрузка (АИС КР + декларируемый доход) ---
    const referenceRate = LEGAL_RULES.RATES.GRADE_ANNUAL_RATE_PERCENT.C;
    const estimatedNewPayment = annuityPayment(
      input.requestedAmountByn,
      referenceRate,
      input.requestedTermMonths,
    );
    const income = Number(input.profile.declaredMonthlyIncomeByn);
    const dti = income > 0 ? (aisKr.totalMonthlyObligationsByn + estimatedNewPayment) / income : 1;

    let dtiAdj = 40;
    if (dti > LEGAL_RULES.UNDERWRITING.MAX_DEBT_TO_INCOME_RATIO) {
      dtiAdj = -200;
    } else if (dti > 0.35) {
      dtiAdj = -60;
    }
    score += dtiAdj;
    reasons.push(
      `Долговая нагрузка (ПДН) с учётом нового платежа: ${Math.round(dti * 100)}% (${dtiAdj >= 0 ? '+' : ''}${dtiAdj} б.)`,
    );

    score = Math.max(300, Math.min(850, Math.round(score)));

    const grade = gradeFromScore(score);
    const annualRatePercent = LEGAL_RULES.RATES.GRADE_ANNUAL_RATE_PERCENT[grade];

    // --- Расчёт максимально доступной суммы по остатку платёжеспособности ---
    const maxMonthlyPayment =
      income * LEGAL_RULES.UNDERWRITING.MAX_DEBT_TO_INCOME_RATIO - aisKr.totalMonthlyObligationsByn;
    const maxAmountByCapacity = round2(
      maxPrincipalForPayment(maxMonthlyPayment, annualRatePercent, input.requestedTermMonths),
    );

    let decision = ScoringDecision.APPROVED;
    let approvedAmountByn: number | undefined;
    let approvedTermMonths: number | undefined = input.requestedTermMonths;

    const hardReject =
      bki.hasActiveCollectionCase ||
      score < LEGAL_RULES.UNDERWRITING.MIN_SCORE_TO_APPROVE ||
      maxAmountByCapacity < LEGAL_RULES.LOAN.MIN_AMOUNT_BYN;

    if (hardReject) {
      decision = ScoringDecision.REJECTED;
      reasons.push('Итог: заявка отклонена — недостаточный скоринговый балл или платёжеспособность');
    } else {
      approvedAmountByn = round2(
        Math.min(input.requestedAmountByn, maxAmountByCapacity, LEGAL_RULES.LOAN.MAX_AMOUNT_BYN),
      );
      if (approvedAmountByn < LEGAL_RULES.LOAN.MIN_AMOUNT_BYN) {
        decision = ScoringDecision.REJECTED;
        approvedAmountByn = undefined;
        approvedTermMonths = undefined;
        reasons.push('Итог: одобряемая сумма ниже минимально допустимой — заявка отклонена');
      } else if (
        approvedAmountByn < input.requestedAmountByn ||
        score < LEGAL_RULES.UNDERWRITING.MIN_SCORE_FULL_APPROVAL
      ) {
        decision = ScoringDecision.APPROVED_WITH_CONDITIONS;
        reasons.push(
          `Итог: одобрено на изменённых условиях — сумма ${approvedAmountByn} BYN, ставка ${annualRatePercent}% годовых (грейд ${grade})`,
        );
      } else {
        reasons.push(
          `Итог: одобрено — сумма ${approvedAmountByn} BYN, ставка ${annualRatePercent}% годовых (грейд ${grade})`,
        );
      }
    }

    const result = this.repo.create({
      applicationId: input.applicationId,
      inn: input.profile.inn,
      bkiReport: bki as unknown as Record<string, unknown>,
      aisKrReport: aisKr as unknown as Record<string, unknown>,
      debtToIncomeRatio: round2(dti),
      score,
      grade,
      decision,
      approvedAmountByn,
      approvedTermMonths: decision === ScoringDecision.REJECTED ? undefined : approvedTermMonths,
      annualRatePercent: decision === ScoringDecision.REJECTED ? undefined : annualRatePercent,
      reasons,
    });
    return this.repo.save(result);
  }

  findByApplication(applicationId: string): Promise<ScoringResult | null> {
    return this.repo.findOne({ where: { applicationId }, order: { createdAt: 'DESC' } });
  }
}

function delinquencyScorePenalty(days: number): number {
  if (days <= 0) return 0;
  if (days <= 5) return -10;
  if (days <= 15) return -40;
  if (days <= 30) return -80;
  if (days <= 60) return -150;
  return -250;
}

function gradeFromScore(score: number): ScoringGrade {
  if (score >= 750) return ScoringGrade.A;
  if (score >= 650) return ScoringGrade.B;
  if (score >= 550) return ScoringGrade.C;
  if (score >= 480) return ScoringGrade.D;
  return ScoringGrade.E;
}
