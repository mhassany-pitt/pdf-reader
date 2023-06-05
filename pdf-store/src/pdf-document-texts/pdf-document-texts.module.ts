import { Module } from '@nestjs/common';
import { PDFDocumentTextsController } from './pdf-document-texts.controller';
import { PDFDocumentTextsService } from './pdf-document-texts.service';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PDFDocumentTextSchema } from './pdf-document-text.schema';
import { UsersModule } from 'src/users/users.module';

const MongoSchemas = MongooseModule.forFeature([
  { name: 'pdf-document-texts', schema: PDFDocumentTextSchema },
]);

@Module({
  imports: [MongoSchemas, UsersModule],
  controllers: [PDFDocumentTextsController],
  providers: [ConfigService, PDFDocumentTextsService],
  exports: [MongoSchemas]
})
export class PDFDocumentTextsModule { }
