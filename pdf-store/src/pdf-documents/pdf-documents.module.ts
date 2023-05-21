import { Module } from '@nestjs/common';
import { PDFDocumentsController } from './pdf-documents.controller';
import { PDFDocumentsService } from './pdf-documents.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [PDFDocumentsController],
  providers: [ConfigService, PDFDocumentsService],
})
export class PDFDocumentsModule { }
