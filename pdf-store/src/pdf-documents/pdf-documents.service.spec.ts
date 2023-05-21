import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocumentsService } from './pdf-documents.service';

describe('PDFDocumentsService', () => {
  let service: PDFDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PDFDocumentsService],
    }).compile();

    service = module.get<PDFDocumentsService>(PDFDocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
