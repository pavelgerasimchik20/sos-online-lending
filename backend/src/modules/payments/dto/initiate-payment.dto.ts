import { IsNumber, IsUUID, Min } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  loanId: string;

  @IsNumber()
  @Min(1)
  amountByn: number;
}
