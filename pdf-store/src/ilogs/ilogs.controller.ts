import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('ilogs')
export class ILogsController {

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) { }

  @Post()
  createBulk(@Req() req: any, @Body() log: any) {
    const userIdObj = req.user?.id ? { userId: req.user?.id } : {};
    this.logger.info({
      ...log,
      ...userIdObj,
      serverDatetime: Date.now(),
    });
  }
}
