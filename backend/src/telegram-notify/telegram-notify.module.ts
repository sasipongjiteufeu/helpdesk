import { Module } from '@nestjs/common';
import { TelegramNotifyService } from './telegram-notify.service';
import { TelegramNotifyController } from './telegram-notify.controller';

@Module({
  controllers: [TelegramNotifyController],
  providers: [TelegramNotifyService],
  exports: [TelegramNotifyService],
})
export class TelegramNotifyModule {}
