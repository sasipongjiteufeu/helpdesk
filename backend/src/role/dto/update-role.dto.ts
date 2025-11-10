import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { RoleEnum } from '../entities/role.enum';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @IsEmail()
  @IsOptional()
  email?: string; // used when changing user's role by email

  @IsEnum(RoleEnum)
  @IsOptional()
  name?: RoleEnum; // optional if you also use this for editing role name
}
