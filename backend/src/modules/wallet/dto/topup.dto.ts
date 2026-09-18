import { IsNumber, Max, Min } from 'class-validator';

export class TopUpDto {
  @IsNumber()
  @Min(1)
  @Max(1000000)
  amountByn: number;
}
