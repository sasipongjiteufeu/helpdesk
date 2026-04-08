import { TicketStatus } from '../entities/ticket.entity';

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
  filter?: TicketFilterName;
  filters?: TicketFilterName[];
  search?: string;
  page?: number;
  limit?: number;
  status?: TicketStatus;
}
