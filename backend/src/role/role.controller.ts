import { BadRequestException, Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleEnum } from './entities/role.enum';
import { RoleService } from './role.service';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Patch('assign')
  async assignRole(@Body() dto: UpdateRoleDto) {
    if (!dto.email || !dto.name) {
      throw new BadRequestException('email and role name are required');
    }
    return this.roleService.addRoleToUserByEmail(dto.email, dto.name);
  }
  @Patch('removeRoleFromUserByEmail')
  async removeRoleFromUserByEmail(@Body() dto:UpdateRoleDto){
    if(!dto.email || !dto.name){
      throw new BadRequestException('email and role name are required to Delete role from that email')
    }
    return this.roleService.removeRoleFromUserByEmail(dto.email, dto.name)
  }
}
