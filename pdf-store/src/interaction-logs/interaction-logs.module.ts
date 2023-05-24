import { Module } from '@nestjs/common';
import { InteractionLogsController } from './interaction-logs.controller';
import { InteractionLogsService } from './interaction-logs.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [InteractionLogsController],
  providers: [ConfigService, InteractionLogsService]
})
export class InteractionLogsModule { }
