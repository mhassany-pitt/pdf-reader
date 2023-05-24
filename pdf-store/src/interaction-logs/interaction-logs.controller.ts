import { Body, Controller, Post, Req } from '@nestjs/common';
import { InteractionLogsService } from './interaction-logs.service';

@Controller('interaction-logs')
export class InteractionLogsController {

  constructor(private service: InteractionLogsService) { }

  @Post()
  createBulk(@Req() req: any, @Body() logs: any[]) {
    if (req.user)
      logs.forEach(log => log.user_id = req.user.id);
    this.service.writeToFile(logs);
  }
}
