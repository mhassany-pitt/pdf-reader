import { Module } from '@nestjs/common';
import { PDFDocumentSharesController } from './pdf-document-shares.controller';
import { PDFDocumentSharesService } from './pdf-document-shares.service';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PDFDocumentShareSchema } from './pdf-document-share.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'pdf-document-shares', schema: PDFDocumentShareSchema }])],
  controllers: [PDFDocumentSharesController],
  providers: [ConfigService, PDFDocumentSharesService]
})
export class PDFDocumentSharesModule { }
