import { Test, TestingModule } from '@nestjs/testing';
import { ILogsController } from './ilogs.controller';

describe('ILogsController', () => {
  let controller: ILogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ILogsController],
    }).compile();

    controller = module.get<ILogsController>(ILogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
