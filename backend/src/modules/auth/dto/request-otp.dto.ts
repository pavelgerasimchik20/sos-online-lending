import { IsEnum, Matches } from 'class-validator';
import { OtpPurpose } from '../../../common/enums';

export class RequestOtpDto {
  @Matches(/^\+375\d{9}$/, { message: 'Номер телефона в формате +375XXXXXXXXX' })
  phone: string;

  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}
