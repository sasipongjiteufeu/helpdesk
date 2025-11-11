import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketDto } from './create-ticket.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketStatus } from '../entities/ticket-state.enum';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
@IsOptional()
  @IsEnum(TicketStatus)
  state?: TicketStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
  tal: undefined;
}
