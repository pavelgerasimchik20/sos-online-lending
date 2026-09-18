import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class UpdateRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
