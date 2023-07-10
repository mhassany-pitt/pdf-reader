import { Body, Controller, Post, Req } from '@nestjs/common';
import { InteractionLogsService } from './interaction-logs.service';

@Controller('interaction-logs')
export class InteractionLogsController {

  constructor(private service: InteractionLogsService) { }

  @Post()
  createBulk(@Body() logs: any[]) {
    // TODO: use a logger and compress the logs
    this.service.writeToFile(logs);
  }
}
