import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class InteractionLogsService {

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger
  ) { }

  writeToFile(logs: any[]) {
    const server_datetime = new Date();
    for (const log of logs)
      this.logger.info({ ...log, server_datetime });
  }
}
