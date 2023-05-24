import { Test, TestingModule } from '@nestjs/testing';
import { PDFReaderService } from './pdf-reader.service';

describe('PDFReaderService', () => {
  let service: PDFReaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PDFReaderService],
    }).compile();

    service = module.get<PDFReaderService>(PDFReaderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
