import { Test, TestingModule } from '@nestjs/testing';
import { TicketPathService } from './ticket-path.service';

describe('TicketPathService', () => {
  let service: TicketPathService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketPathService],
    }).compile();

    service = module.get<TicketPathService>(TicketPathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
