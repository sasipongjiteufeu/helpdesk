import { RoleEnum } from 'src/role/entities/role.enum';
import { IsEnum } from 'class-validator';

export class CreateRoleDto {
  @IsEnum(RoleEnum)
  name: RoleEnum;
}
