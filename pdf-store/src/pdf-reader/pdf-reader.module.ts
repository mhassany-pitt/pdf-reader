import { Module } from '@nestjs/common';
import { PDFReaderController } from './pdf-reader.controller';
import { ConfigService } from '@nestjs/config';
import { PDFDocumentsModule } from 'src/pdf-documents/pdf-documents.module';
import { PDFDocumentLinksModule } from 'src/pdf-document-links/pdf-document-links.module';

@Module({
  imports: [
    PDFDocumentsModule,
    PDFDocumentLinksModule,
  ],
  controllers: [PDFReaderController],
  providers: [ConfigService]
})
export class PDFReaderModule { }
