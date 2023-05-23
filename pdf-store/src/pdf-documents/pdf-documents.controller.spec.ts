import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocumentsController } from './pdf-documents.controller';

describe('PDFDocumentsController', () => {
  let controller: PDFDocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PDFDocumentsController],
    }).compile();

    controller = module.get<PDFDocumentsController>(PDFDocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
