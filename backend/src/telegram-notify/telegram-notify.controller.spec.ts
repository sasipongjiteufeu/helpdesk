import { Test, TestingModule } from '@nestjs/testing';
import { TelegramNotifyController } from './telegram-notify.controller';
import { TelegramNotifyService } from './telegram-notify.service';

describe('TelegramNotifyController', () => {
  let controller: TelegramNotifyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramNotifyController],
      providers: [TelegramNotifyService],
    }).compile();

    controller = module.get<TelegramNotifyController>(TelegramNotifyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
