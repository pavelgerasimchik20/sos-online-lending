import { ArrayNotEmpty, IsArray, IsEnum, Matches, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class AdminCreateUserDto {
  /** Телефон (+375XXXXXXXXX) или произвольный логин от 3 символов. */
  @Matches(/^(\+375\d{9}|[a-zA-Z0-9_.-]{3,32})$/, {
    message: 'Введите номер телефона в формате +375XXXXXXXXX или логин от 3 символов',
  })
  login: string;

  @MinLength(4, { message: 'Пароль должен быть не короче 4 символов' })
  password: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
