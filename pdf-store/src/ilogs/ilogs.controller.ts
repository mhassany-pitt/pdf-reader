import { Body, Controller, Inject, Post } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('ilogs')
export class ILogsController {

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) { }

  @Post()
  createBulk(@Body() log: any) {
    this.logger.info({ ...log, serverDatetime: Date.now() });
  }
}
