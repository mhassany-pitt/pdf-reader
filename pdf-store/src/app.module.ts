import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PDFDocumentsModule } from './pdf-documents/pdf-documents.module';

@Module({
  imports: [
    PDFDocumentsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.development.env',
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
