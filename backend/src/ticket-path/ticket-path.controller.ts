import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TicketPathService } from './ticket-path.service';
import { CreateTicketPathDto } from './dto/create-ticket-path.dto';
import { UpdateTicketPathDto } from './dto/update-ticket-path.dto';

@Controller('ticket-path')
export class TicketPathController {
  constructor(private readonly ticketPathService: TicketPathService) {}

  @Post()
  create(@Body() createTicketPathDto: CreateTicketPathDto) {
    return this.ticketPathService.create(createTicketPathDto);
  }

  @Get()
  findAll() {
    return this.ticketPathService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketPathService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTicketPathDto: UpdateTicketPathDto) {
    return this.ticketPathService.update(+id, updateTicketPathDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketPathService.remove(+id);
  }
}
