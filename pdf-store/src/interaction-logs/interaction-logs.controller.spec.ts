import { Test, TestingModule } from '@nestjs/testing';
import { InteractionLogsController } from './interaction-logs.controller';

describe('InteractionLogsController', () => {
  let controller: InteractionLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InteractionLogsController],
    }).compile();

    controller = module.get<InteractionLogsController>(InteractionLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
