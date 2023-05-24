import { Module } from '@nestjs/common';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AnnotationSchema } from './annotation.schema';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'annotations', schema: AnnotationSchema }
    ])
  ],
  controllers: [AnnotationsController],
  providers: [ConfigService, AnnotationsService]
})
export class AnnotationsModule { }
