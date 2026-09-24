import { IsNumber, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateCommitmentDto {
  @IsUUID()
  applicationId: string;

  @IsNumber()
  @Min(10)
  amountByn: number;

  @IsString()
  @Length(6, 6, { message: 'Код подтверждения — 6 цифр' })
  otpCode: string;
}
