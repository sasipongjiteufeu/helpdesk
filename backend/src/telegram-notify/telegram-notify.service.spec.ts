import { Test, TestingModule } from '@nestjs/testing';
import { TelegramNotifyService } from './telegram-notify.service';

describe('TelegramNotifyService', () => {
  let service: TelegramNotifyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramNotifyService],
    }).compile();

    service = module.get<TelegramNotifyService>(TelegramNotifyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
