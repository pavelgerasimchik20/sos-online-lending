import { IsDateString, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class SubmitKycDto {
  @IsString()
  lastName: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  patronymic?: string;

  @IsDateString()
  birthDate: string;

  @Matches(/^[A-Z]{2}$/, { message: 'Серия паспорта — 2 латинские заглавные буквы, напр. MP' })
  passportSeries: string;

  @Matches(/^\d{7}$/, { message: 'Номер паспорта — 7 цифр' })
  passportNumber: string;

  @IsString()
  passportIssuedBy: string;

  @IsDateString()
  passportIssuedDate: string;

  @Matches(/^\d{7}[A-Z]\d{3}[A-Z]{2}\d$/, {
    message: 'Идентификационный номер — формат РБ, напр. 3050588A123PB4',
  })
  inn: string;

  @IsString()
  registrationAddress: string;

  @IsOptional()
  @IsString()
  actualAddress?: string;

  @IsNumber({}, { message: 'Заявленный доход — число (BYN)' })
  @Min(0, { message: 'Заявленный доход не может быть отрицательным' })
  declaredMonthlyIncomeByn: number;

  @IsOptional()
  @IsString()
  employer?: string;

  @IsOptional()
  @IsString()
  eripAccountRef?: string;
}
