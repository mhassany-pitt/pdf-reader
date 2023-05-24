import { Test, TestingModule } from '@nestjs/testing';
import { InteractionLogsService } from './interaction-logs.service';

describe('InteractionLogsService', () => {
  let service: InteractionLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InteractionLogsService],
    }).compile();

    service = module.get<InteractionLogsService>(InteractionLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
