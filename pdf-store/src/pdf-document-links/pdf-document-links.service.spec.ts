import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocumentLinksService } from './pdf-document-links.service';

describe('PDFDocumentLinksService', () => {
  let service: PDFDocumentLinksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PDFDocumentLinksService],
    }).compile();

    service = module.get<PDFDocumentLinksService>(PDFDocumentLinksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
