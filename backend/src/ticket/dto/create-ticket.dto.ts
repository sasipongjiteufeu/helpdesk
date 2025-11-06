import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { TicketState } from '../entities/ticket-state.enum';
export class CreateTicketDto {
@IsString()
@Length(1,200)
title: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  picture?: string[];          // URLs / keys

  @IsUUID()
  createdById: string;         // FK → users.id

  @IsOptional()
  @IsUUID()
  assignedToId?: string;       // FK → users.id

  @IsOptional()
  @IsString()
  @Length(3, 20)               // adjust to your format
  // If you want strict Thai numbers: use a regex or IsPhoneNumber('TH')
  telephone?: string;

  @IsOptional()
  @IsEnum(TicketState)
  state?: TicketState;         // default WAITING if omitted
}


