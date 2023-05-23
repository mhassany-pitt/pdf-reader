import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocumentSharesService } from './pdf-document-shares.service';

describe('PDFDocumentSharesService', () => {
  let service: PDFDocumentSharesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PDFDocumentSharesService],
    }).compile();

    service = module.get<PDFDocumentSharesService>(PDFDocumentSharesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
