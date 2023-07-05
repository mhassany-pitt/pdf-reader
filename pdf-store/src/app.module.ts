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
import { InteractionLogsModule } from './interaction-logs/interaction-logs.module';
import { PDFDocumentTextsModule } from './pdf-document-texts/pdf-document-texts.module';
import { UserAdminModule } from './user-admin/user-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get('MONGO_URI') }),
    }),
    AuthModule,
    UsersModule,
    PDFDocumentsModule,
    PDFDocumentLinksModule,
    PDFReaderModule,
    AnnotationsModule,
    InteractionLogsModule,
    PDFDocumentTextsModule,
    UserAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService]
})
export class AppModule { }
