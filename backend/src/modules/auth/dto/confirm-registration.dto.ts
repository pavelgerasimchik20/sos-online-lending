import { IsIn, IsOptional, Matches, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class ConfirmRegistrationDto {
  @Matches(/^\+375\d{9}$/, { message: 'Номер телефона в формате +375XXXXXXXXX' })
  phone: string;

  @Matches(/^\d{6}$/, { message: 'Код подтверждения — 6 цифр' })
  code: string;

  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  password: string;

  /** Необязательно — по умолчанию заёмщик; роль инвестора можно добавить позже в кабинете. */
  @IsOptional()
  @IsIn([UserRole.BORROWER, UserRole.LENDER])
  role?: UserRole.BORROWER | UserRole.LENDER;
}
