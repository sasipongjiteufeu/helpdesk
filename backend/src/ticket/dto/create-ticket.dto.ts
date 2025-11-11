import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { TicketStatus } from '../entities/ticket-state.enum';
export class CreateTicketDto {
  
  @IsString() 
  @MaxLength(200) 
  title: string;
 
  @IsString()
  @MaxLength(1000) 
  detail: string;

  @IsOptional() 
  @IsString() 
  @MaxLength(20)
  telephone?: string;

    // --- Assign Ticket fields ---
  @IsOptional()
  @IsUUID()
  userId?: string; // the user (agent) assigned to handle the ticket

  // --- Change Status fields ---
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus; // "OPEN" | "IN_PROGRESS" | "RESOLVED"
}


