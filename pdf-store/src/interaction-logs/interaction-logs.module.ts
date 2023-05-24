import { Module } from '@nestjs/common';
import { InteractionLogsController } from './interaction-logs.controller';
import { InteractionLogsService } from './interaction-logs.service';

@Module({
  controllers: [InteractionLogsController],
  providers: [InteractionLogsService]
})
export class InteractionLogsModule { }
