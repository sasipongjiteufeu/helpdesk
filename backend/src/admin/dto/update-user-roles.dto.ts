// src/admin/dto/update-user-roles.dto.ts
import { IsArray, IsEnum } from 'class-validator';
import { RoleEnum } from 'src/role/entities/role.enum';

export class UpdateUserRolesDto {
  @IsArray()
  @IsEnum(RoleEnum, { each: true })
  roles: RoleEnum[];
}
