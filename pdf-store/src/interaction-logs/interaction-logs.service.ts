import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ensureDirSync, writeFileSync } from 'fs-extra';
import { storageRoot } from 'src/utils';

@Injectable()
export class InteractionLogsService {

  constructor(private config: ConfigService) {
    ensureDirSync(storageRoot(this.config, 'interaction-logs'));
  }

  writeToFile(logs: any[]) {
    const date = new Date().toISOString().substring(0, 10);
    writeFileSync(
      storageRoot(this.config, `interaction-logs/${date}.log`),
      logs.map(log => JSON.stringify(log)).join('\n'),
      { flag: 'a' }
    );
  }
}
