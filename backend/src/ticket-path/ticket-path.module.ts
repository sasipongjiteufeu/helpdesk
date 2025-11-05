import { Module } from '@nestjs/common';
import { TicketPathService } from './ticket-path.service';
import { TicketPathController } from './ticket-path.controller';

@Module({
  controllers: [TicketPathController],
  providers: [TicketPathService],
})
export class TicketPathModule {}
