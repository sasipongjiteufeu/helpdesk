import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketPathDto } from './create-ticket-path.dto';

export class UpdateTicketPathDto extends PartialType(CreateTicketPathDto) {}
