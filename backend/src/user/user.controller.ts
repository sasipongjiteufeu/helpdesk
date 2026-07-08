import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthenticatedGuard } from 'src/auth/guards/authenticated.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RoleEnum } from 'src/role/entities/role.enum';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** List users with AGENT role — for adding ticket collaborators. */
  @Get('agents')
  @UseGuards(AuthenticatedGuard, RolesGuard)
  @Roles(RoleEnum.AGENT, RoleEnum.ADMIN)
  listAgents(@Query('search') search?: string) {
    return this.userService.listAgents(search);
  }
}
