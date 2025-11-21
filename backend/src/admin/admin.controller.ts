// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AuthenticatedGuard } from 'src/auth/guards/authenticated.guard';
import { RoleEnum } from 'src/role/entities/role.enum';
import { TicketService } from 'src/ticket/ticket.service';

@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles(RoleEnum.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService,
    private readonly tickets: TicketService
  ) {}

  // === USERS + ROLES ===
  @Get('users')
  getUsers() {
    return this.adminService.getUsersWithTicketCounts();
  }

  @Patch('users/:id/roles')
  updateUserRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.adminService.updateUserRoles(id, dto.roles);
  }

  // === STATS ===
  @Get('stats/year')
  getYearStats(@Query('year') yearQ?: string) {
    const year = yearQ ? parseInt(yearQ, 10) : new Date().getFullYear();
    return this.adminService.getYearStats(year);
  }
  @Get('sla')
  async getSla(
    @Query('year') yearStr?: string,
    @Query('days') daysStr?: string,
  ) {
    const now = new Date();
    const year = yearStr ? Number(yearStr) : now.getFullYear();
    const days = daysStr ? Number(daysStr) : 3; // default 3 days

    return this.tickets.getSlaMetricsForYear(year, days);
  }
  @Get('stats/month')
  getMonthStats(
    @Query('year') yearQ?: string,
    @Query('month') monthQ?: string,
  ) {
    const now = new Date();
    const year = yearQ ? parseInt(yearQ, 10) : now.getFullYear();
    const month = monthQ ? parseInt(monthQ, 10) : now.getMonth() + 1;
    return this.adminService.getMonthStatusStats(year, month);
  }
}
