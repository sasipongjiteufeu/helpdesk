// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from 'src/user/entities/user.entity';
import { Ticket } from 'src/ticket/entities/ticket.entity';
import { Role } from 'src/role/entities/role.entity';
import { TicketModule } from 'src/ticket/ticket.module';
import { TicketRating } from 'src/ticket/entities/ticket-rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Ticket, Role, TicketRating]),TicketModule],
  controllers: [AdminController],
  providers: [AdminService,],
})
export class AdminModule {}
