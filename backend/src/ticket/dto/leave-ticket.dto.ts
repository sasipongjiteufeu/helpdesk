import { IsOptional, IsUUID } from 'class-validator';

export class LeaveTicketDto {
  @IsOptional()
  @IsUUID()
  agentId?: string;
}
