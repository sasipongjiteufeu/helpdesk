import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketDto } from './create-ticket.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketState } from '../entities/ticket-state.enum';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
@IsOptional()
  @IsEnum(TicketState)
  state?: TicketState;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
