import { Body, Controller, Post } from '@nestjs/common';
import { InteractionLogsService } from './interaction-logs.service';

@Controller('interaction-logs')
export class InteractionLogsController {

  constructor(private service: InteractionLogsService) { }

  @Post()
  createBulk(@Body() logs: any[]) {
    this.service.createBulk(logs);
  }
}
