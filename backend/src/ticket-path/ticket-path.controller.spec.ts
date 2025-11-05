import { Test, TestingModule } from '@nestjs/testing';
import { TicketPathController } from './ticket-path.controller';
import { TicketPathService } from './ticket-path.service';

describe('TicketPathController', () => {
  let controller: TicketPathController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketPathController],
      providers: [TicketPathService],
    }).compile();

    controller = module.get<TicketPathController>(TicketPathController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
