import { Module } from '@nestjs/common';
import { PDFDocumentsController } from './pdf-documents.controller';
import { PDFDocumentsService } from './pdf-documents.service';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PDFDocumentSchema } from './pdf-document.schema';
import { PDFFileSchema } from './pdf-file.schema';
import { PDFDocumentTextSchema } from '../pdf-document-texts/pdf-document-text.schema';
import { PDFDocumentTextsModule } from 'src/pdf-document-texts/pdf-document-texts.module';

const MongoSchemas = MongooseModule.forFeature([
  { name: 'pdf-files', schema: PDFFileSchema },
  { name: 'pdf-documents', schema: PDFDocumentSchema },
]);

@Module({
  imports: [
    PDFDocumentTextsModule,
    MongoSchemas
  ],
  controllers: [PDFDocumentsController],
  providers: [ConfigService, PDFDocumentsService],
  exports: [
    PDFDocumentsService,
    MongoSchemas
  ]
})
export class PDFDocumentsModule { }
