import { Injectable } from '@nestjs/common';

@Injectable()
export class InteractionLogsService {

  createBulk(logs: any[]) {
    console.table(logs);
  }
}
