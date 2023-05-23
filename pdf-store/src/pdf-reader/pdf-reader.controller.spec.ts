import { Test, TestingModule } from '@nestjs/testing';
import { PDFReaderController } from './pdf-reader.controller';

describe('PDFReaderController', () => {
  let controller: PDFReaderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PDFReaderController],
    }).compile();

    controller = module.get<PDFReaderController>(PDFReaderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
