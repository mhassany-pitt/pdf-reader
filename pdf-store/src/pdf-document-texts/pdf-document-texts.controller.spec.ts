import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocumentTextsController } from './pdf-document-texts.controller';

describe('PDFDocumentTextsController', () => {
  let controller: PDFDocumentTextsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PDFDocumentTextsController],
    }).compile();

    controller = module.get<PDFDocumentTextsController>(PDFDocumentTextsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
