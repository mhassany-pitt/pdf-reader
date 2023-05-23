import {
  Body, Controller, Get, Param,
  Patch, Post, Query, UseGuards
} from '@nestjs/common';
import { PDFDocumentSharesService } from './pdf-document-shares.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';

@Controller('pdf-document-shares')
export class PDFDocumentSharesController {

  constructor(
    private service: PDFDocumentSharesService,
  ) { }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Query('pdfDocId') pdfDocId: string) {
    const list = await this.service.list(pdfDocId);
    return list.map(useId);
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Query('pdfDocId') pdfDocId: string, @Body() body: any) {
    return useId(await this.service.create(pdfDocId, body));
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async get(@Param('id') id: string) {
    return useId(await this.service.read(id));
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    return useId(await this.service.update(id, body));
  }

  @Patch(':id/publish')
  @UseGuards(AuthenticatedGuard)
  publish(@Param('id') id: string, @Body() body: any) {
    this.service.publish(id, body.published);
  }
}
