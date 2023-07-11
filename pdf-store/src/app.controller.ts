import axios from 'axios';
import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { storageRoot } from './utils';
import { exists, writeFile } from 'fs-extra';
import { decode } from 'base-64';

@Controller()
export class AppController {

  constructor(private config: ConfigService) { }

  @Get('load-remote-pdf/:url')
  async proxy(@Param('url') url: string, @Res() res: Response) {
    url = decode(url);

    // cache the file in local storage
    const fileId = createHash('sha256').update(url).digest('hex');
    const path = storageRoot(this.config, 'pdf-files', fileId);
    if (!await exists(path)) {
      await writeFile(path,
        (await axios.get(url, { responseType: 'arraybuffer' })).data,
        { encoding: 'binary' });
    }

    // return the file if exists
    if (!await exists(path))
      throw new NotFoundException();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'max-age=2592000'); // 30 days

    res.sendFile(path, { root: '.' });
  }
}