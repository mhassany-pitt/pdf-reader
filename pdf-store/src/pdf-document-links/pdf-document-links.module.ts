import { Module } from '@nestjs/common';
import { PDFDocumentLinksController } from './pdf-document-links.controller';
import { PDFDocumentLinksService } from './pdf-document-links.service';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PDFDocumentLinkSchema } from './pdf-document-link.schema';
import { PDFDocumentsModule } from 'src/pdf-documents/pdf-documents.module';

const MongoSchemas = MongooseModule.forFeature([
  { name: 'pdf-document-links', schema: PDFDocumentLinkSchema }
])

@Module({
  imports: [MongoSchemas, PDFDocumentsModule],
  controllers: [PDFDocumentLinksController],
  providers: [ConfigService, PDFDocumentLinksService],
  exports: [
    PDFDocumentLinksService,
    MongoSchemas
  ]
})
export class PDFDocumentLinksModule { }
