import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateCommitmentDto {
  @IsUUID()
  applicationId: string;

  @IsNumber()
  @Min(10)
  amountByn: number;
}
