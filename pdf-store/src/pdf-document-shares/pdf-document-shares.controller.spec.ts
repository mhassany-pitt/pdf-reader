import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocumentSharesController } from './pdf-document-shares.controller';

describe('PDFDocumentSharesController', () => {
  let controller: PDFDocumentSharesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PDFDocumentSharesController],
    }).compile();

    controller = module.get<PDFDocumentSharesController>(PDFDocumentSharesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
