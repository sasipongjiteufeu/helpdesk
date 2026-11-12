import { IsEnum, IsUUID } from 'class-validator';
import { TicketStatus } from '../entities/ticket-state.enum';
export class AssignTicketDto { @IsUUID() userId: string; }
export class ChangeTicketStatusDto { @IsEnum(TicketStatus) status: TicketStatus; }
