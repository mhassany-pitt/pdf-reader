import { Body, Controller, Post } from '@nestjs/common';
import { InteractionLogsService } from './interaction-logs.service';

@Controller('interaction-logs')
export class InteractionLogsController {

  constructor(private service: InteractionLogsService) { }

  @Post()
  createBulk(@Body() logs: any[]) {
    // TODO: include user information
    this.service.writeToFile(logs);
  }
}
