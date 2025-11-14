import { Body, Controller, Patch } from '@nestjs/common';
import { RoleService } from './role.service';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Patch('assign')
  async assignRole(@Body() dto: UpdateRoleDto) {
    if (!dto.email || !dto.name) {
      throw new Error('email and role name are required');
    }
    return this.roleService.addRoleToUserByEmail(dto.email, dto.name);
  }
  @Patch('removeRoleFromUserByEmail')
  async removeRoleFromUserByEmail(@Body() dto:UpdateRoleDto){
    if(!dto.email || !dto.name){
      throw new Error('email and role name are required to Delete role from that email')
    }
    return this.roleService.removeRoleFromUserByEmail(dto.email, dto.name)
  }
}
