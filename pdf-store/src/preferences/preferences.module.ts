import { Module } from '@nestjs/common';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PreferenceSchema } from './preference.schema';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'preferences', schema: PreferenceSchema }
    ]),
    UsersModule,
  ],
  controllers: [PreferencesController],
  providers: [ConfigService, PreferencesService]
})
export class PreferencesModule { }
