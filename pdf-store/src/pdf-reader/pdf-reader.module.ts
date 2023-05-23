import { Module } from '@nestjs/common';
import { PDFReaderController } from './pdf-reader.controller';
import { PDFReaderService } from './pdf-reader.service';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PDFDocumentSchema } from 'src/pdf-documents/pdf-document.schema';
import { PDFFileSchema } from 'src/pdf-documents/pdf-file.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'pdf-documents', schema: PDFDocumentSchema },
      { name: 'pdf-files', schema: PDFFileSchema }
    ])
  ],
  controllers: [PDFReaderController],
  providers: [ConfigService, PDFReaderService]
})
export class PDFReaderModule { }
