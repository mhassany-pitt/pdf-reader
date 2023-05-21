import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PDFDocumentsModule } from './pdf-documents/pdf-documents.module';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    AuthModule,
    UsersModule,
    PDFDocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
