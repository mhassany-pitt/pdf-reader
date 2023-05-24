import { Module } from '@nestjs/common';
import { PDFDocumentTextsController } from './pdf-document-texts.controller';
import { PDFDocumentTextsService } from './pdf-document-texts.service';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PDFDocumentTextSchema } from './pdf-document-text.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'pdf-document-texts', schema: PDFDocumentTextSchema },
    ])
  ],
  controllers: [PDFDocumentTextsController],
  providers: [ConfigService, PDFDocumentTextsService]
})
export class PDFDocumentTextsModule { }
