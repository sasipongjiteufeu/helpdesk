import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Ticket } from './entities/ticket.entity';
import { User } from 'src/user/entities/user.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, User]),
    MulterModule.register({
      storage: memoryStorage(),          // file.buffer available
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max; adjust as needed
    }),
  ],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
