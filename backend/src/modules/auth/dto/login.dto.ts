import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  /** Номер телефона (+375XXXXXXXXX) или служебный логин (например, "admin"). */
  @Matches(/^(\+375\d{9}|[a-zA-Z0-9_.-]{3,32})$/, {
    message: 'Введите номер телефона в формате +375XXXXXXXXX или логин',
  })
  login: string;

  @IsString()
  @MinLength(3)
  password: string;
}
