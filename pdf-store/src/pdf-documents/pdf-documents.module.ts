import { Module } from '@nestjs/common';
import { PDFDocumentsController } from './pdf-documents.controller';
import { PDFDocumentsService } from './pdf-documents.service';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PDFDocumentSchema } from './pdf-document.schema';
import { PDFFileSchema } from './pdf-file.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'pdf-documents', schema: PDFDocumentSchema },
      { name: 'pdf-files', schema: PDFFileSchema }
    ])
  ],
  controllers: [PDFDocumentsController],
  providers: [ConfigService, PDFDocumentsService],
  exports: [PDFDocumentsService]
})
export class PDFDocumentsModule { }
