import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PDFDocumentsModule } from './pdf-documents/pdf-documents.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PDFDocumentLinksModule } from './pdf-document-links/pdf-document-links.module';
import { PDFReaderModule } from './pdf-reader/pdf-reader.module';
import { AnnotationsModule } from './annotations/annotations.module';
import { ILogsModule } from './ilogs/ilogs.module';
import { PDFDocumentTextsModule } from './pdf-document-texts/pdf-document-texts.module';
import { UserAdminModule } from './user-admin/user-admin.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${(process.env.NODE_ENV || 'development').toLowerCase()}`
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService], //
      useFactory: (config: ConfigService) => ({
        transports: [
          new winston.transports.Console(),
          new DailyRotateFile({
            filename: `${config.get('STORAGE_PATH')}/logs/%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '128m',
          }),
        ],
      })
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get('MONGO_URI') }),
    }),
    AuthModule, UsersModule, UserAdminModule,
    PDFDocumentsModule,
    PDFDocumentLinksModule,
    PDFReaderModule,
    AnnotationsModule,
    ILogsModule,
    PDFDocumentTextsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService]
})
export class AppModule { }
