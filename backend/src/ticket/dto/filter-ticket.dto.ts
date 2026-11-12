import { TicketStatus } from '../entities/ticket.entity';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
const FILTERS = ['ALL', 'ACTIVE', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'FINISHED_BY_ME', 'COMMIT', 'IN_PROGRESS_BY_ME'];

export type TicketFilterName =
  | 'ALL'
  | 'ACTIVE'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'FINISHED_BY_ME'
  | 'COMMIT'
  | 'IN_PROGRESS_BY_ME';

export class FilterTicketDto {
  @IsOptional() @IsIn(FILTERS)
  filter?: TicketFilterName;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsIn(FILTERS, { each: true })
  filters?: TicketFilterName[];
  @IsOptional() @IsString() @MaxLength(200)
  search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
  @IsOptional() @IsEnum(TicketStatus)
  status?: TicketStatus;
}
