import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';

@Controller()
export class AppController {

  @Get('proxy/:url')
  @Header('Content-Type', 'application/pdf')
  async proxy(@Param('url') url: string, @Res() res: Response) {
    const { data } = await axios.get(decodeURIComponent(url), { responseType: 'arraybuffer' });
    res.setHeader('Content-Type', 'application/pdf');
    res.send(data);
  }
}