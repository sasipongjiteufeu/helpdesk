import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTicketMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}
