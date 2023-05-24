import { Module } from '@nestjs/common';
import { PDFReaderController } from './pdf-reader.controller';
import { ConfigService } from '@nestjs/config';
import { PDFDocumentsModule } from 'src/pdf-documents/pdf-documents.module';
import { PDFDocumentLinksModule } from 'src/pdf-document-links/pdf-document-links.module';
import { PDFReaderService } from './pdf-reader.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    PDFDocumentsModule,
    PDFDocumentLinksModule,
  ],
  controllers: [PDFReaderController],
  providers: [ConfigService, PDFReaderService]
})
export class PDFReaderModule { }
