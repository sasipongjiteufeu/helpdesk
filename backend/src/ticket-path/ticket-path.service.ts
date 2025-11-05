import { Injectable } from '@nestjs/common';
import { CreateTicketPathDto } from './dto/create-ticket-path.dto';
import { UpdateTicketPathDto } from './dto/update-ticket-path.dto';

@Injectable()
export class TicketPathService {
  create(createTicketPathDto: CreateTicketPathDto) {
    return 'This action adds a new ticketPath';
  }

  findAll() {
    return `This action returns all ticketPath`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ticketPath`;
  }

  update(id: number, updateTicketPathDto: UpdateTicketPathDto) {
    return `This action updates a #${id} ticketPath`;
  }

  remove(id: number) {
    return `This action removes a #${id} ticketPath`;
  }
}
