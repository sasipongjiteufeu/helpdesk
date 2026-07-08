import { IsArray, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class AddTicketAgentsDto {
  @ValidateIf((dto: AddTicketAgentsDto) => !dto.agentIds?.length)
  @IsUUID()
  agentId?: string;

  @ValidateIf((dto: AddTicketAgentsDto) => !dto.agentId)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  agentIds?: string[];
}
