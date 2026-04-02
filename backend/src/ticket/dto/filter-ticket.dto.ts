import { TicketStatus } from '../entities/ticket.entity';

export type TicketFilterName =
  | 'ALL'
  | 'ACTIVE'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMMIT';

export class FilterTicketDto {
  filter?: TicketFilterName;
  search?: string;
  page?: number;
  limit?: number;
  status?: TicketStatus;
}
