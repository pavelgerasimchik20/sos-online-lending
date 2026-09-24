import { IsString, Length } from 'class-validator';

export class ConfirmFundingDto {
  @IsString()
  @Length(6, 6, { message: 'Код подтверждения — 6 цифр' })
  otpCode: string;
}
