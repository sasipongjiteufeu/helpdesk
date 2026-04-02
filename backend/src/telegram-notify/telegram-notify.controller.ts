import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TelegramNotifyService } from './telegram-notify.service';
import { CreateTelegramNotifyDto } from './dto/create-telegram-notify.dto';
import { UpdateTelegramNotifyDto } from './dto/update-telegram-notify.dto';

@Controller('telegram-notify')
export class TelegramNotifyController {
  constructor(private readonly telegramNotifyService: TelegramNotifyService) {}


}
