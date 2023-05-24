import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocumentTextsService } from './pdf-document-texts.service';

describe('PDFDocumentTextsService', () => {
  let service: PDFDocumentTextsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PDFDocumentTextsService],
    }).compile();

    service = module.get<PDFDocumentTextsService>(PDFDocumentTextsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
