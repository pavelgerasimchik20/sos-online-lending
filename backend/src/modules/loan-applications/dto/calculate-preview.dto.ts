import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { LEGAL_RULES } from '../../../config/legal-rules.config';

export class CalculatePreviewDto {
  @IsNumber()
  @Min(LEGAL_RULES.LOAN.MIN_AMOUNT_BYN)
  @Max(LEGAL_RULES.LOAN.MAX_AMOUNT_BYN)
  amountByn: number;

  @IsInt()
  @Min(LEGAL_RULES.LOAN.MIN_TERM_MONTHS)
  @Max(LEGAL_RULES.LOAN.MAX_TERM_MONTHS)
  termMonths: number;
}
