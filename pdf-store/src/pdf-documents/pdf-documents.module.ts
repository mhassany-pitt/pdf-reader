import { Module } from '@nestjs/common';
import { PDFDocumentsController } from './pdf-documents.controller';
import { PDFDocumentsService } from './pdf-documents.service';

@Module({
  controllers: [PDFDocumentsController],
  providers: [PDFDocumentsService],
})
export class PDFDocumentsModule { }
