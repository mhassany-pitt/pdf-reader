import { Module } from '@nestjs/common';
import { PDFDocumentLinksController } from './pdf-document-links.controller';
import { PDFDocumentLinksService } from './pdf-document-links.service';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PDFDocumentLinkSchema } from './pdf-document-link.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'pdf-document-links', schema: PDFDocumentLinkSchema }])],
  controllers: [PDFDocumentLinksController],
  providers: [ConfigService, PDFDocumentLinksService]
})
export class PDFDocumentLinksModule { }
