import { IsInt, IsNumber, IsString, Max, Min, MinLength } from 'class-validator';
import { LEGAL_RULES } from '../../../config/legal-rules.config';

export class CreateApplicationDto {
  @IsNumber()
  @Min(LEGAL_RULES.LOAN.MIN_AMOUNT_BYN)
  @Max(LEGAL_RULES.LOAN.MAX_AMOUNT_BYN)
  requestedAmountByn: number;

  @IsInt()
  @Min(LEGAL_RULES.LOAN.MIN_TERM_MONTHS)
  @Max(LEGAL_RULES.LOAN.MAX_TERM_MONTHS)
  requestedTermMonths: number;

  @IsString()
  @MinLength(3)
  purpose: string;
}
