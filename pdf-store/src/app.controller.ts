import axios from 'axios';
import { Controller, Get, Header, NotFoundException, Param, Res } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { storageRoot } from './utils';
import { existsSync, writeFileSync } from 'fs-extra';

@Controller()
export class AppController {

  constructor(private config: ConfigService) { }

  @Get('proxy/:url')
  @Header('Content-Type', 'application/pdf')
  async proxy(@Param('url') url: string, @Res() res: Response) {
    url = decodeURIComponent(url);

    // cache the file in local storage
    const fileId = createHash('sha256').update(url).digest('hex');
    const path = storageRoot(this.config, 'pdf-files', fileId);
    if (!existsSync(path)) {
      writeFileSync(path,
        (await axios.get(url, { responseType: 'arraybuffer' })).data,
        { encoding: 'binary' });
    }

    // return the file if exists
    if (!existsSync(path))
      throw new NotFoundException();

    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(path, { root: '.' });
  }
}