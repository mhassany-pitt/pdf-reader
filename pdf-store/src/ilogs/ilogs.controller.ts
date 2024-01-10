import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('ilogs')
export class ILogsController {

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) { }

  // TODO: but everyone can call this api and any other public api?!
  // should avoid simple dos attacks

  @Post()
  create(@Req() req: any, @Body() logs: any[]) {
    const sdatetime = Date.now();
    const userIdObj = req.user?.id ? { userId: req.user?.id } : {};
    for (const log of logs)
      this.logger.info({ ...log, ...userIdObj, sdatetime });
  }

  // TODO: separate logs for each document
}
