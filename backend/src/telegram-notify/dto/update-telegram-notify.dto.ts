import { PartialType } from '@nestjs/mapped-types';
import { CreateTelegramNotifyDto } from './create-telegram-notify.dto';

export class UpdateTelegramNotifyDto extends PartialType(CreateTelegramNotifyDto) {}
