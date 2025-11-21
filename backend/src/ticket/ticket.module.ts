import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Ticket } from './entities/ticket.entity';
import { User } from 'src/user/entities/user.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TicketImage } from './entities/ticket-image.entity';
import { EmailService } from 'src/email/email.service';
import { TelegramNotifyModule } from 'src/telegram-notify/telegram-notify.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, User, TicketImage]),
    MulterModule.register({
      storage: memoryStorage(),          // file.buffer available
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max; adjust as needed
    }),TelegramNotifyModule
  ],
  controllers: [TicketController],
  providers: [TicketService, EmailService],
  exports: [TicketService],
})
export class TicketModule {}
