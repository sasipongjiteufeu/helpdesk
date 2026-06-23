import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Ticket } from './entities/ticket.entity';
import { User } from 'src/user/entities/user.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TicketImage } from './entities/ticket-image.entity';
import { EmailService } from 'src/email/email.service';
import { TelegramNotifyModule } from 'src/telegram-notify/telegram-notify.module';
import { TicketMessage } from './entities/ticket-message.entity';
import { TicketMessageAttachment } from './entities/ticket-message-attachment.entity';
import { TicketMessageService } from './ticket-message.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      User,
      TicketImage,
      TicketMessage,
      TicketMessageAttachment,
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'tickets');
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max; adjust as needed
    }),TelegramNotifyModule
  ],
  controllers: [TicketController],
  providers: [TicketService, TicketMessageService, EmailService],
  exports: [TicketService],
})
export class TicketModule {}
