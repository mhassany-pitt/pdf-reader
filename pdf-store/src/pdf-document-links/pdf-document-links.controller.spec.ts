import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocumentLinksController } from './pdf-document-links.controller';

describe('PDFDocumentLinksController', () => {
  let controller: PDFDocumentLinksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PDFDocumentLinksController],
    }).compile();

    controller = module.get<PDFDocumentLinksController>(PDFDocumentLinksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
