import { Module } from '@nestjs/common';
import { ILogsController } from './ilogs.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [ILogsController],
  providers: [ConfigService]
})
export class ILogsModule { }
